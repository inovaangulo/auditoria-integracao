#!/usr/bin/env node
/**
 * Sincroniza as pastas de documentos dos colaboradores no SharePoint com a
 * planilha de auditoria.
 *
 * Convencao (definida pela Sara em 12/08/2026):
 *   pasta:   {CPF ou CNPJ so numeros}_{Nome completo, espacos -> underscore}
 *   arquivo: {mesma coisa}_{TIPODOC}.ext   (TIPODOC = ultimo trecho do nome,
 *            antes da extensao - ex.: "111222333_Ana_Paula_ASO.pdf")
 *
 * Para cada colaborador da planilha:
 *   1. Garante que a pasta existe no SharePoint (cria se faltar).
 *   2. Le os nomes dos arquivos dentro da pasta.
 *   3. Para cada arquivo cujo TIPODOC bate com CAMPOS_POR_ABREV (schema.js),
 *      marca o campo correspondente como "Recebido".
 *   4. Se algo mudou, recalcula as colunas derivadas e grava a linha de volta
 *      na planilha.
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
import { COLUNAS, CAMPOS_POR_ABREV } from '../js/schema.js';
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

function apenasDigitos(s) {
  return String(s || '').replace(/\D/g, '');
}

function normalizarNome(s) {
  return String(s || '').trim().replace(/\s+/g, '_');
}

function nomePasta(registro) {
  const doc = apenasDigitos(registro['CPF'] || registro['CNPJ (se PJ)']);
  return `${doc}_${normalizarNome(registro['Nome completo'])}`;
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

/** Garante que a pasta do colaborador existe. Devolve true se já existia. */
async function garantirPasta(token, nomeDaPasta) {
  const { siteId, pastaBase } = CONFIG.pastasColaboradores;
  const caminho = `${pastaBase}/${nomeDaPasta}`;
  const urlMeta = `${GRAPH}/sites/${siteId}/drive/root:/${codificarCaminho(caminho)}`;

  const resp = await fetch(urlMeta, { headers: { Authorization: `Bearer ${token}` } });
  if (resp.ok) return true;
  if (resp.status !== 404) throw new Error(`Erro ao verificar a pasta ${caminho}: ${resp.status} ${await resp.text()}`);

  const urlCriar = `${GRAPH}/sites/${siteId}/drive/root:/${codificarCaminho(pastaBase)}:/children`;
  await chamar(token, urlCriar, {
    method: 'POST',
    body: JSON.stringify({ name: nomeDaPasta, folder: {}, '@microsoft.graph.conflictBehavior': 'fail' }),
  });
  return false;
}

async function listarArquivos(token, nomeDaPasta) {
  const { siteId, pastaBase } = CONFIG.pastasColaboradores;
  const caminho = `${pastaBase}/${nomeDaPasta}`;
  const url = `${GRAPH}/sites/${siteId}/drive/root:/${codificarCaminho(caminho)}:/children?$select=name`;
  const dados = await chamar(token, url);
  return (dados.value || []).map((item) => item.name);
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
  console.log(`${registros.length} colaborador(es) encontrado(s).`);

  let pastasCriadas = 0;
  let colaboradoresAtualizados = 0;

  for (const registro of registros) {
    const pasta = nomePasta(registro);

    const jaExistia = await garantirPasta(token, pasta);
    if (!jaExistia) {
      pastasCriadas++;
      console.log(`Pasta criada para ${registro['Nome completo']}: ${pasta}`);
      continue; // pasta acabou de nascer, ainda sem arquivo - nada a sincronizar
    }

    const arquivos = await listarArquivos(token, pasta);
    const mudou = aplicarDeteccao(registro, arquivos);
    if (mudou) {
      const atualizado = recalcular(registro);
      await escreverLinha(token, atualizado);
      colaboradoresAtualizados++;
      console.log(`Atualizado: ${registro['Nome completo']}`);
    }
  }

  console.log(
    `\nResumo: ${pastasCriadas} pasta(s) nova(s) criada(s), ` +
    `${colaboradoresAtualizados} colaborador(es) atualizado(s) na planilha.`
  );
}

main().catch((err) => {
  console.error('Falha na sincronizacao:', err.message);
  process.exitCode = 1;
});
