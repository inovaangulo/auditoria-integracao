#!/usr/bin/env node
/**
 * Audita as pastas de documentos dos colaboradores no SharePoint e usa a
 * PASTA como o sinal de entrada de um colaborador novo - a planilha comeca
 * vazia e cresce conforme as pastas aparecem (mudanca de 13/08/2026, pedido
 * da Sara: "quero que inicialmente a planilha nao tenha dados de nenhum
 * colaborador... isso sinaliza um novo colaborador entrando").
 *
 * Convencao (definida pela Sara em 12/08/2026):
 *   pasta:   {CPF ou CNPJ com pontuacao, so' a barra do CNPJ vira "-"}_{Nome completo, espacos -> underscore}
 *   arquivo: {mesma coisa}_{TIPODOC}.ext   (TIPODOC = ultimo trecho do nome,
 *            antes da extensao - ex.: "111.222.333-44_Ana_Paula_ASO.pdf")
 *
 * As PASTAS SAO CRIADAS PELAS PROFISSIONAIS DA ADM, nao pelo script. Para
 * cada pasta encontrada em TESTES_IA_ADM:
 *
 *   1. Extrai o CPF/CNPJ e o nome do proprio nome da pasta.
 *      - Nao tem 11 nem 14 digitos -> pasta "nao reconhecida", ignorada
 *        (nao cria nada - o formato precisa estar certo para confiar nele).
 *   2. Procura na planilha um colaborador com esse CPF/CNPJ.
 *      - Nao achou -> COLABORADOR NOVO: cria uma linha na planilha (Nome,
 *        CPF ou CNPJ, Tipo inferido pelo formato do documento - CPF de 11
 *        digitos = CLT, CNPJ de 14 = PJ - e Status atual = "Documento em
 *        elaboracao", a primeira coluna do Kanban).
 *      - Achou, mas o nome completo da pasta nao e' exatamente o esperado
 *        -> RENOMEIA a pasta para o padrao certo. Seguro fazer isso porque
 *        o CPF/CNPJ ja' identificou com certeza de quem e' a pasta - so' o
 *        nome escrito pela pessoa estava errado/incompleto.
 *   3. Le os arquivos dentro da pasta (ja' com o nome corrigido, se foi o
 *      caso). Para cada um cujo TIPODOC bate com CAMPOS_POR_ABREV
 *      (schema.js), marca o campo correspondente como "Recebido" e grava de
 *      volta na planilha.
 *   4. Reporta tambem colaboradores que ja estao na planilha mas nao tem
 *      pasta correspondente (raro nesse fluxo, mas pode acontecer se a
 *      pasta for apagada depois).
 *
 * So' ADICIONA confirmacoes - nunca apaga ou rebaixa um status que ja' estava
 * marcado (ex.: nao troca "Nao se aplica" de volta para vazio so' porque o
 * arquivo nao foi encontrado). Se um arquivo for removido do SharePoint depois,
 * o status "Recebido" fica como estava; ajuste manualmente se for o caso.
 *
 * Autenticacao: sem senha nenhuma. Troca o token OIDC que o GitHub Actions
 * gera para este job (federated credential no Entra ID) por um token do
 * Microsoft Graph. So' funciona dentro de um workflow do GitHub Actions com
 * `permissions: id-token: write` - fora dele, ACTIONS_ID_TOKEN_REQUEST_URL
 * nao existe e o script para com uma mensagem clara.
 *
 * Uso local (sem GitHub Actions): nao ha' como testar a autenticacao fora do
 * Actions, mas da' pra revisar a logica com `node --check scripts/sincronizar-documentos.mjs`.
 */

import { CONFIG } from '../js/config.js';
import { COLUNAS, CAMPOS_POR_ABREV, registroVazio } from '../js/schema.js';
import { linhaParaRegistro, registroParaLinha } from '../js/dados/planilha.js';
import { recalcular } from '../js/regras.js';

const GRAPH = 'https://graph.microsoft.com/v1.0';

// ---------------------------------------------------------------------------
// Autenticacao (OIDC do GitHub Actions -> token do Microsoft Graph)
// ---------------------------------------------------------------------------

async function tokenGitHubActions() {
  const url = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
  const token = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if (!url || !token) {
    throw new Error(
      'Este script so roda dentro de um workflow do GitHub Actions com ' +
      '"permissions: id-token: write" (as variaveis ACTIONS_ID_TOKEN_REQUEST_* nao existem aqui).'
    );
  }
  const resp = await fetch(`${url}&audience=api://AzureADTokenExchange`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) throw new Error(`Falha ao obter o token do GitHub Actions: ${resp.status} ${await resp.text()}`);
  const { value } = await resp.json();
  return value;
}

async function tokenGraph() {
  const githubToken = await tokenGitHubActions();
  const body = new URLSearchParams({
    scope: 'https://graph.microsoft.com/.default',
    client_id: CONFIG.azure.clientId,
    client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    client_assertion: githubToken,
    grant_type: 'client_credentials',
  });
  const resp = await fetch(`https://login.microsoftonline.com/${CONFIG.tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!resp.ok) throw new Error(`Falha ao trocar o token por um do Microsoft Graph: ${resp.status} ${await resp.text()}`);
  const { access_token } = await resp.json();
  return access_token;
}

async function chamar(token, url, opcoes = {}) {
  const resp = await fetch(url, {
    ...opcoes,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(opcoes.headers || {}),
    },
  });
  if (!resp.ok) {
    throw new Error(`Graph ${opcoes.method || 'GET'} ${url} -> ${resp.status}: ${await resp.text()}`);
  }
  return resp.status === 204 ? null : resp.json();
}

// ---------------------------------------------------------------------------
// Nomeacao de pasta/arquivo
// ---------------------------------------------------------------------------

/**
 * Mantem a pontuacao do CPF/CNPJ (ajuda a diferenciar um do outro de cara),
 * so' troca "/" por "-" porque SharePoint/OneDrive proibem barra em nome de
 * pasta ou arquivo - e o CNPJ tem uma barra (ex.: 12.345.678/0001-90).
 */
function paraNomeDeArquivo(s) {
  return String(s || '').trim().replace(/\//g, '-');
}

/** So' os digitos - usado para achar a pasta certa mesmo com pontuacao diferente. */
function apenasDigitos(s) {
  return String(s || '').replace(/\D/g, '');
}

function normalizarNome(s) {
  return String(s || '').trim().replace(/\s+/g, '_');
}

function nomePasta(registro) {
  const doc = paraNomeDeArquivo(registro['CPF'] || registro['CNPJ (se PJ)']);
  return `${doc}_${normalizarNome(registro['Nome completo'])}`;
}

/**
 * Devolve o CNPJ com a barra de volta no lugar certo (ela virou "-" para
 * poder aparecer em nome de pasta/arquivo). Ex.: "12.345.678-0001-90" ->
 * "12.345.678/0001-90". Se o formato vier diferente do esperado, devolve
 * como recebeu - melhor um CNPJ estranho na planilha do que o script quebrar.
 */
function reconstituirCnpj(doc) {
  const m = doc.match(/^(\d{2}\.\d{3}\.\d{3})-(\d{4})-(\d{2})$/);
  return m ? `${m[1]}/${m[2]}-${m[3]}` : doc;
}

/**
 * Le o CPF/CNPJ e o nome completo direto do nome da pasta (o inverso de
 * nomePasta). Devolve null se o numero de digitos nao bate com CPF (11) nem
 * CNPJ (14) - nesse caso e' mais seguro nao criar nada do que arriscar um
 * cadastro errado.
 */
function novoRegistroDaPasta(nomeDaPasta) {
  const i = nomeDaPasta.indexOf('_');
  if (i < 0) return null;

  const doc = nomeDaPasta.slice(0, i);
  const nome = nomeDaPasta.slice(i + 1).replace(/_/g, ' ').trim();
  const digitos = apenasDigitos(doc);
  if (!nome) return null;

  const registro = registroVazio();
  registro['Nome completo'] = nome;
  registro['Status atual'] = 'Documento em elaboração';

  if (digitos.length === 11) {
    registro['Tipo'] = 'CLT';
    registro['CPF'] = doc;
  } else if (digitos.length === 14) {
    registro['Tipo'] = 'PJ';
    registro['CNPJ (se PJ)'] = reconstituirCnpj(doc);
  } else {
    return null;
  }
  return registro;
}

/** TIPODOC = ultimo trecho do nome do arquivo, antes da extensao, sem acento. */
function tipoDoArquivo(nomeArquivo) {
  const semExtensao = nomeArquivo.replace(/\.[^.]+$/, '');
  const partes = semExtensao.split('_');
  const ultimo = partes[partes.length - 1] || '';
  return ultimo.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Codifica um caminho com varios segmentos para a sintaxe root:/a/b:/ do Graph. */
function codificarCaminho(caminho) {
  return caminho.split('/').map(encodeURIComponent).join('/');
}

// ---------------------------------------------------------------------------
// Pastas de documentos (site "admin" / TESTES_IA_ADM)
// ---------------------------------------------------------------------------

/** Lista as pastas de colaborador que ja existem dentro da pasta base. */
async function listarPastas(token) {
  const { siteId, pastaBase } = CONFIG.pastasColaboradores;
  const url = `${GRAPH}/sites/${siteId}/drive/root:/${codificarCaminho(pastaBase)}:/children?$select=name,folder`;
  const dados = await chamar(token, url);
  return (dados.value || []).filter((item) => item.folder).map((item) => item.name);
}

async function listarArquivos(token, nomeDaPasta) {
  const { siteId, pastaBase } = CONFIG.pastasColaboradores;
  const caminho = `${pastaBase}/${nomeDaPasta}`;
  const url = `${GRAPH}/sites/${siteId}/drive/root:/${codificarCaminho(caminho)}:/children?$select=name`;
  const dados = await chamar(token, url);
  return (dados.value || []).map((item) => item.name);
}

/**
 * Renomeia a pasta do colaborador para o nome no padrao esperado. So' chamada
 * quando o CPF/CNPJ ja bateu com um colaborador - renomear pelo nome sozinho
 * seria arriscado (nome poderia ser de outra pessoa por coincidencia).
 */
async function renomearPasta(token, nomeAtual, nomeNovo) {
  const { siteId, pastaBase } = CONFIG.pastasColaboradores;
  const caminho = `${pastaBase}/${nomeAtual}`;
  const url = `${GRAPH}/sites/${siteId}/drive/root:/${codificarCaminho(caminho)}`;
  await chamar(token, url, {
    method: 'PATCH',
    body: JSON.stringify({ name: nomeNovo }),
  });
}

/** Aplica os arquivos encontrados ao registro. Devolve true se algo mudou. */
function aplicarDeteccao(registro, nomesDeArquivo) {
  const tiposEncontrados = new Set(nomesDeArquivo.map(tipoDoArquivo));
  let mudou = false;
  for (const tipo of tiposEncontrados) {
    const campos = CAMPOS_POR_ABREV[tipo];
    if (!campos) continue; // TIPODOC nao reconhecido - ignora, nao trava a sincronizacao
    for (const campo of campos) {
      if (registro[campo] !== 'Recebido') {
        registro[campo] = 'Recebido';
        mudou = true;
      }
    }
  }
  return mudou;
}

// ---------------------------------------------------------------------------
// Planilha (site AUTOMACAOINOVACAO)
// ---------------------------------------------------------------------------

function ultimaColuna() {
  let s = '', resto = COLUNAS.length;
  while (resto > 0) {
    const m = (resto - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    resto = Math.floor((resto - 1) / 26);
  }
  return s;
}

async function lerPlanilha(token) {
  const { driveId, itemId, aba } = CONFIG.planilha;
  const url = `${GRAPH}/drives/${driveId}/items/${itemId}/workbook/worksheets('${encodeURIComponent(aba)}')/usedRange(valuesOnly=true)?$select=values`;
  const dados = await chamar(token, url);
  const linhas = dados.values || [];

  const registros = [];
  linhas.slice(1).forEach((linha, i) => {
    if (!String(linha[0] || '').trim()) return;
    const reg = linhaParaRegistro(linha);
    reg.__linha = i + 2;
    registros.push(reg);
  });
  return registros;
}

async function escreverLinha(token, registro) {
  const { driveId, itemId, aba } = CONFIG.planilha;
  const endereco = `A${registro.__linha}:${ultimaColuna()}${registro.__linha}`;
  const url = `${GRAPH}/drives/${driveId}/items/${itemId}/workbook/worksheets('${encodeURIComponent(aba)}')/range(address='${endereco}')`;
  await chamar(token, url, {
    method: 'PATCH',
    body: JSON.stringify({ values: [registroParaLinha(registro)] }),
  });
}

// ---------------------------------------------------------------------------
// Execucao
// ---------------------------------------------------------------------------

async function main() {
  console.log('Autenticando via GitHub Actions (sem senha armazenada)...');
  const token = await tokenGraph();

  console.log('Lendo a planilha...');
  const registros = await lerPlanilha(token);
  console.log(`${registros.length} colaborador(es) já na planilha.`);

  console.log('Listando pastas em TESTES_IA_ADM...');
  const pastasExistentes = await listarPastas(token);
  console.log(`${pastasExistentes.length} pasta(s) encontrada(s).`);

  // Indexa a planilha pelos digitos do CPF/CNPJ - e' o dado mais confiavel
  // para casar pasta com colaborador, mesmo se o nome tiver erro de digitacao.
  const registroPorDigitos = new Map();
  for (const r of registros) {
    const d = apenasDigitos(r['CPF'] || r['CNPJ (se PJ)']);
    if (d) registroPorDigitos.set(d, r);
  }
  const digitosIniciais = new Set(registroPorDigitos.keys());

  const usadas = new Set();
  let novosColaboradores = 0;
  let conferem = 0;
  let nomesCorrigidos = 0;
  let falhasAoCorrigir = 0;
  let naoReconhecidas = 0;
  let colaboradoresAtualizados = 0;
  let proximaLinha = registros.length + 2; // 1 = cabecalho

  for (const pasta of pastasExistentes) {
    const digitos = apenasDigitos(pasta);
    let registro = digitos ? registroPorDigitos.get(digitos) : null;
    let pastaAtual = pasta;

    if (!registro) {
      // Sem colaborador correspondente na planilha - a pasta em si e' o
      // sinal de que alguem novo esta entrando. So' cria se o nome da pasta
      // realmente tiver um CPF/CNPJ valido (11 ou 14 digitos); senao, ignora.
      const novo = novoRegistroDaPasta(pasta);
      if (!novo) {
        naoReconhecidas++;
        console.log(`NAO RECONHECIDA: pasta "${pasta}" não tem um CPF/CNPJ válido no nome - ignorada.`);
        continue;
      }
      novo.__linha = proximaLinha++;
      registro = recalcular(novo);
      await escreverLinha(token, registro);
      novosColaboradores++;
      registroPorDigitos.set(digitos, registro);
      console.log(`NOVO COLABORADOR: ${registro['Nome completo']} (${registro['Tipo']}) cadastrado a partir da pasta "${pasta}".`);
    } else {
      const esperado = nomePasta(registro);
      if (pasta === esperado) {
        conferem++;
      } else {
        // O CPF/CNPJ ja bateu com este colaborador, entao renomear e' seguro -
        // nao ha risco de "roubar" a pasta de outra pessoa por coincidencia de nome.
        try {
          await renomearPasta(token, pasta, esperado);
          pastaAtual = esperado;
          nomesCorrigidos++;
          console.log(`NOME CORRIGIDO: ${registro['Nome completo']} - pasta renomeada de "${pasta}" para "${esperado}".`);
        } catch (err) {
          falhasAoCorrigir++;
          console.log(`NAO FOI POSSIVEL CORRIGIR O NOME: ${registro['Nome completo']} - pasta "${pasta}" deveria ser "${esperado}": ${err.message}`);
        }
      }
    }
    usadas.add(digitos);

    const arquivos = await listarArquivos(token, pastaAtual);
    if (arquivos.length) {
      const tipos = arquivos.map((a) => `${a} -> ${tipoDoArquivo(a) || '(sem TIPODOC)'}`);
      console.log(`  ${registro['Nome completo']}: ${tipos.join(' | ')}`);
    }
    const mudou = aplicarDeteccao(registro, arquivos);
    if (mudou) {
      const atualizado = recalcular(registro);
      await escreverLinha(token, atualizado);
      colaboradoresAtualizados++;
      console.log(`  Atualizado na planilha: ${registro['Nome completo']}`);
    }
  }

  const semPasta = [...digitosIniciais].filter((d) => !usadas.has(d));
  for (const d of semPasta) {
    const r = registroPorDigitos.get(d);
    console.log(`SEM PASTA: ${r['Nome completo']} - já está na planilha, mas nenhuma pasta correspondente foi encontrada.`);
  }

  console.log(
    `\nResumo: ${novosColaboradores} colaborador(es) novo(s) cadastrado(s), ` +
    `${conferem} pasta(s) já conferindo, ${nomesCorrigidos} nome(s) corrigido(s), ` +
    `${falhasAoCorrigir} falha(s) ao corrigir, ${naoReconhecidas} pasta(s) não reconhecida(s), ` +
    `${semPasta.length} colaborador(es) sem pasta, ${colaboradoresAtualizados} atualizado(s) na planilha.`
  );
}

main().catch((err) => {
  console.error('Falha na sincronizacao:', err.message);
  process.exitCode = 1;
});
