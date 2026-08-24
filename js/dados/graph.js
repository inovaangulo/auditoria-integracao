/**
 * Adaptador SHAREPOINT: le e grava direto na planilha via Microsoft Graph.
 *
 * A planilha continua sendo a fonte da verdade - quem abrir o arquivo no Excel
 * ve' o mesmo que o app. Cada pessoa entra com a propria conta @angulosocial.com
 * e o Graph so' devolve o que ela ja' teria permissao de abrir no SharePoint.
 *
 * Requer o registro de aplicativo no Azure AD (CONFIG.azure.clientId). Sem ele,
 * o app cai no adaptador local.
 */

import { CONFIG } from '../config.js';
import { linhaParaRegistro, registroParaLinha, gerarArquivo, baixar } from './planilha.js';
import { COLUNAS } from '../schema.js';

const CDN_MSAL = 'https://cdn.jsdelivr.net/npm/@azure/msal-browser@3/lib/msal-browser.min.js';
const GRAFO = 'https://graph.microsoft.com/v1.0';

// Nome INTENCIONALMENTE nao e' so' "Historico": o Excel reserva esse nome
// exato (equivalente ao "History" em ingles) para a antiga funcionalidade de
// Controle de Alteracoes - toda tentativa de criar uma aba com esse nome
// falha com um erro generico "argumento invalido" no Graph, sem nunca criar
// a aba (bug descoberto em 18/08/2026 apos testar com uma pasta de teste).
const ABA_HISTORICO = 'Histórico de Alterações';
const CABECALHO_HISTORICO = ['Data/Hora', 'Usuário', 'Chave', 'Colaborador', 'Campo', 'Valor anterior', 'Valor novo'];

/** Ultima coluna da tabela (48 colunas = AV). Derivada para nao desalinhar se COLUNAS mudar. */
function ultimaColuna() {
  const n = COLUNAS.length;
  let s = '';
  let resto = n;
  while (resto > 0) {
    const m = (resto - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    resto = Math.floor((resto - 1) / 26);
  }
  return s;
}

function carregarMsal() {
  if (window.msal) return Promise.resolve(window.msal);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = CDN_MSAL;
    s.onload = () => resolve(window.msal);
    s.onerror = () => reject(new Error('Não foi possível carregar a biblioteca de login da Microsoft.'));
    document.head.appendChild(s);
  });
}

export class FonteSharePoint {
  constructor() {
    this.nome = 'Planilha no SharePoint';
    this.centralizada = true;
    this.msal = null;
    this.conta = null;
    this.colunaFinal = ultimaColuna();
  }

  get base() {
    const { driveId, itemId, aba } = CONFIG.planilha;
    return `${GRAFO}/drives/${driveId}/items/${itemId}/workbook/worksheets('${encodeURIComponent(aba)}')`;
  }

  async iniciar() {
    const msal = await carregarMsal();
    this.msal = new msal.PublicClientApplication({
      auth: {
        clientId: CONFIG.azure.clientId,
        authority: CONFIG.azure.authority,
        redirectUri: window.location.origin + window.location.pathname,
      },
      // sessionStorage: o acesso morre ao fechar o navegador, que e' o desejavel
      // para dado pessoal em maquina compartilhada.
      cache: { cacheLocation: 'sessionStorage' },
    });
    await this.msal.initialize();
    await this.msal.handleRedirectPromise();

    const contas = this.msal.getAllAccounts();
    this.conta = contas[0] || null;
    return { conectado: Boolean(this.conta), usuario: this.conta?.username || null };
  }

  async conectar() {
    const r = await this.msal.loginPopup({ scopes: CONFIG.azure.scopes });
    this.conta = r.account;
    this.msal.setActiveAccount(this.conta);
    return { conectado: true, usuario: this.conta.username };
  }

  async sair() {
    await this.msal.logoutPopup({ account: this.conta });
    this.conta = null;
  }

  /** Token de acesso; renova em silencio e so' abre popup se o consentimento faltar. */
  async token() {
    if (!this.conta) throw new Error('Não conectado.');
    try {
      const r = await this.msal.acquireTokenSilent({
        scopes: CONFIG.azure.scopes,
        account: this.conta,
      });
      return r.accessToken;
    } catch {
      const r = await this.msal.acquireTokenPopup({ scopes: CONFIG.azure.scopes });
      return r.accessToken;
    }
  }

  async chamar(url, opcoes = {}, traduzir = traduzirErro) {
    const token = await this.token();
    const resp = await fetch(url, {
      ...opcoes,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(opcoes.headers || {}),
      },
    });

    if (!resp.ok) {
      const corpo = await resp.text();
      throw new Error(traduzir(resp.status, corpo));
    }
    return resp.status === 204 ? null : resp.json();
  }

  /**
   * Le a area preenchida da aba. Guarda em `__linha` o numero real da linha na
   * planilha, porque linhas em branco no meio fariam o indice do array divergir
   * do endereco da celula - e a gravacao iria para a linha errada.
   */
  async carregar() {
    const dados = await this.chamar(`${this.base}/usedRange(valuesOnly=true)?$select=values`);
    const linhas = dados.values || [];

    const registros = [];
    linhas.slice(1).forEach((linha, i) => {
      const reg = linhaParaRegistro(linha);
      if (!String(reg['Nome completo'] || '').trim()) return;  // sem nome nao e' cadastro
      reg.__linha = i + 2;  // +1 do cabecalho, +1 porque a planilha comeca em 1
      registros.push(reg);
    });
    return registros;
  }

  async salvarRegistro(reg) {
    const linha = reg.__linha;
    if (!linha) return this.adicionar(reg);

    const endereco = `A${linha}:${this.colunaFinal}${linha}`;
    await this.chamar(`${this.base}/range(address='${endereco}')`, {
      method: 'PATCH',
      body: JSON.stringify({ values: [registroParaLinha(reg)] }),
    });
    return reg;
  }

  /**
   * Le a linha do colaborador direto do SharePoint, sem cache, pra' detectar
   * se alguem alterou desde que a ficha foi aberta (edicao simultanea).
   * Devolve null se a linha nao existe mais (excluida por outra pessoa).
   */
  async lerRegistroAtual(reg) {
    const linha = reg.__linha;
    if (!linha) return null;
    const endereco = `A${linha}:${this.colunaFinal}${linha}`;
    const dados = await this.chamar(`${this.base}/range(address='${endereco}')?$select=values`);
    const valores = (dados.values || [])[0];
    if (!valores) return null;
    const atual = linhaParaRegistro(valores);
    atual.__linha = linha;
    return atual;
  }

  async adicionar(reg) {
    const atuais = await this.chamar(`${this.base}/usedRange(valuesOnly=true)?$select=rowCount`);
    const linha = (atuais.rowCount || 1) + 1;
    const endereco = `A${linha}:${this.colunaFinal}${linha}`;
    await this.chamar(`${this.base}/range(address='${endereco}')`, {
      method: 'PATCH',
      body: JSON.stringify({ values: [registroParaLinha(reg)] }),
    });
    reg.__linha = linha;
    return reg;
  }

  /**
   * Gera um .xlsx pra download com um retrato dos registros atuais - so' a
   * aba de cadastro (o modo SharePoint nunca importou o arquivo inteiro, so'
   * leu linhas via Graph, entao nao ha' as outras abas - Historico, CLT, PJ,
   * Parametros - pra preservar). Util pra tirar uma copia pontual, nao
   * substitui a planilha de verdade no SharePoint.
   */
  async exportar(registros) {
    const dados = await gerarArquivo(registros, CONFIG.planilha.aba, null);
    const hoje = new Date().toISOString().slice(0, 10);
    baixar(dados, `Painel_Controle_Integracao_${hoje}.xlsx`);
  }

  /**
   * Apaga a linha do colaborador e desloca as de baixo para cima (Graph
   * `range/delete`, shift "Up") - remove mesmo, nao so' limpa as celulas.
   * `__linha` de quem estiver na memoria fica desatualizado apos isso; por
   * isso o app recarrega a planilha inteira em seguida.
   */
  async excluirRegistro(reg) {
    const linha = reg.__linha;
    if (!linha) return; // nunca foi gravado - nada para apagar
    const endereco = `A${linha}:${this.colunaFinal}${linha}`;
    await this.chamar(`${this.base}/range(address='${endereco}')/delete`, {
      method: 'POST',
      body: JSON.stringify({ shift: 'Up' }),
    });
  }

  // -------------------------------------------------------------------------
  // Pastas de documentos (DOCUMENTOS_INTEGRACAO) - gerador de pasta (19/08/2026)
  // -------------------------------------------------------------------------
  // Mesmo site que a sincronizacao automatica varre (scripts/sincronizar-
  // documentos.mjs, repositorio privado), so' que aqui e' a PESSOA LOGADA
  // quem grava, com a propria permissao dela (delegada) - nao precisa de
  // nenhuma permissao nova no Azure AD alem da que o app ja' tem
  // (Files.ReadWrite.All), diferente da automacao (que usa Sites.Selected
  // porque roda sem ninguem logado).

  /**
   * Acha a pasta do colaborador se ja' existir, ou cria se nao existir -
   * nunca duplica (pedido da Sara: se alguem ja' tiver criado a pasta na
   * mao, so' aproveita e sobe os documentos dentro dela).
   */
  async criarOuAcharPastaColaborador(nomePasta) {
    const { siteId, pastaBase } = CONFIG.pastasColaboradores;
    const token = await this.token();
    const caminho = codificarCaminho(`${pastaBase}/${nomePasta}`);

    const existente = await fetch(`${GRAFO}/sites/${siteId}/drive/root:/${caminho}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (existente.ok) {
      const item = await existente.json();
      return { id: item.id, webUrl: item.webUrl, criada: false };
    }
    if (existente.status !== 404) {
      throw new Error(traduzirErroPasta(existente.status, await existente.text()));
    }

    const nova = await this.chamar(
      `${GRAFO}/sites/${siteId}/drive/root:/${codificarCaminho(pastaBase)}:/children`,
      {
        method: 'POST',
        body: JSON.stringify({ name: nomePasta, folder: {}, '@microsoft.graph.conflictBehavior': 'fail' }),
      },
      traduzirErroPasta
    );
    return { id: nova.id, webUrl: nova.webUrl, criada: true };
  }

  /**
   * Envia um arquivo (File do <input>) pra dentro da pasta do colaborador -
   * upload simples para arquivos pequenos, ou em fatias (sessao de upload)
   * para os maiores que 4 MB, que o upload simples do Graph nao aceita
   * (ex.: foto em alta resolucao).
   */
  async enviarArquivoParaPasta(pastaId, nomeArquivo, arquivo) {
    const { siteId } = CONFIG.pastasColaboradores;
    const LIMITE_SIMPLES = 4 * 1024 * 1024;
    const caminhoItem = `${GRAFO}/sites/${siteId}/drive/items/${pastaId}:/${encodeURIComponent(nomeArquivo)}:`;

    if (arquivo.size <= LIMITE_SIMPLES) {
      const bytes = await arquivo.arrayBuffer();
      await this.chamar(`${caminhoItem}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: bytes,
      }, traduzirErroPasta);
      return;
    }

    const sessao = await this.chamar(`${caminhoItem}/createUploadSession`, {
      method: 'POST',
      body: JSON.stringify({ item: { '@microsoft.graph.conflictBehavior': 'replace' } }),
    }, traduzirErroPasta);

    // Multiplo de 320 KiB, exigido pela API de upload em sessao.
    const TAMANHO_FATIA = 10 * 320 * 1024;
    let inicio = 0;
    while (inicio < arquivo.size) {
      const fim = Math.min(inicio + TAMANHO_FATIA, arquivo.size) - 1;
      const fatia = arquivo.slice(inicio, fim + 1);
      // A URL da sessao ja' e' autenticada - o proprio Graph orienta a NAO
      // mandar o cabecalho Authorization nessas requisicoes de fatia.
      const resp = await fetch(sessao.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Length': String(fatia.size),
          'Content-Range': `bytes ${inicio}-${fim}/${arquivo.size}`,
        },
        body: fatia,
      });
      if (!resp.ok) throw new Error(`Falha ao enviar parte do arquivo "${nomeArquivo}" (${resp.status}).`);
      inicio = fim + 1;
    }
  }

  // -------------------------------------------------------------------------
  // Historico compartilhado (aba "Histórico de Alterações" na mesma planilha)
  // -------------------------------------------------------------------------
  // Guardado como uma linha por campo alterado (varias linhas podem
  // compartilhar o mesmo Data/Hora + Usuario quando vem do mesmo salvamento).
  // Fica na planilha em vez de localStorage para que qualquer pessoa, de
  // qualquer computador, veja o mesmo historico.

  get baseHistorico() {
    const { driveId, itemId } = CONFIG.planilha;
    return `${GRAFO}/drives/${driveId}/items/${itemId}/workbook/worksheets('${encodeURIComponent(ABA_HISTORICO)}')`;
  }

  /** Cria a aba de historico se ainda nao existir e garante o cabecalho estilizado. So' confere uma vez por sessao. */
  async garantirAbaHistorico() {
    if (this._historicoOk) return;
    const { driveId, itemId } = CONFIG.planilha;
    const lista = await this.chamar(`${GRAFO}/drives/${driveId}/items/${itemId}/workbook/worksheets?$select=name`);
    const existe = (lista.value || []).some((w) => w.name === ABA_HISTORICO);
    if (!existe) {
      await this.chamar(`${GRAFO}/drives/${driveId}/items/${itemId}/workbook/worksheets/add`, {
        method: 'POST',
        body: JSON.stringify({ name: ABA_HISTORICO }),
      });
      await this.chamar(`${this.baseHistorico}/range(address='A1:G1')`, {
        method: 'PATCH',
        body: JSON.stringify({ values: [CABECALHO_HISTORICO] }),
      });
    }
    // Cor da aba em si nao e' possivel via Graph (so' name/position/visibility) -
    // estiliza o cabecalho como alternativa. Reaplicar em toda sessao e' inofensivo.
    await this.chamar(`${this.baseHistorico}/range(address='A1:G1')/format/fill`, {
      method: 'PATCH',
      body: JSON.stringify({ color: '#C1272D' }),
    });
    await this.chamar(`${this.baseHistorico}/range(address='A1:G1')/format/font`, {
      method: 'PATCH',
      body: JSON.stringify({ bold: true, color: '#FFFFFF' }),
    });
    this._historicoOk = true;
  }

  /** Grava uma entrada (uma ou mais mudancas de campo do mesmo salvamento). */
  async registrarHistorico({ quando, quem, chave, colaborador, mudancas }) {
    await this.garantirAbaHistorico();
    const atuais = await this.chamar(`${this.baseHistorico}/usedRange(valuesOnly=true)?$select=rowCount`);
    const primeiraLinha = (atuais.rowCount || 1) + 1;
    const ultimaLinha = primeiraLinha + mudancas.length - 1;
    const valores = mudancas.map((m) => [quando, quem, chave, colaborador, m.campo, m.de, m.para]);
    await this.chamar(`${this.baseHistorico}/range(address='A${primeiraLinha}:G${ultimaLinha}')`, {
      method: 'PATCH',
      body: JSON.stringify({ values: valores }),
    });
  }

  /** Le o historico de um colaborador, mais recente primeiro. */
  async lerHistorico(chaveColaborador) {
    await this.garantirAbaHistorico();
    const dados = await this.chamar(`${this.baseHistorico}/usedRange(valuesOnly=true)?$select=values`);
    const linhas = (dados.values || []).slice(1);

    // Agrupa linhas com o mesmo Data/Hora + Usuario numa unica entrada, para
    // exibir "3 campos mudaram nesse salvamento" em vez de 3 itens separados.
    const grupos = new Map();
    for (const linha of linhas) {
      const [quando, quem, chaveLinha, , campo, de, para] = linha;
      if (String(chaveLinha || '') !== chaveColaborador) continue;
      const chaveGrupo = `${quando}__${quem}`;
      if (!grupos.has(chaveGrupo)) grupos.set(chaveGrupo, { quando, quem, mudancas: [] });
      grupos.get(chaveGrupo).mudancas.push({ campo, de, para });
    }
    return [...grupos.values()].sort((a, b) => new Date(b.quando) - new Date(a.quando));
  }

  /**
   * Data de entrada de cada colaborador = a entrada mais antiga do historico
   * dele (normalmente "Cadastro", gravada pela sincronizacao automatica ao
   * criar a linha). Le a aba toda de uma vez, em vez de uma chamada por
   * colaborador - por isso devolve um Map, nao um valor unico.
   */
  async lerDatasDeEntrada() {
    await this.garantirAbaHistorico();
    const dados = await this.chamar(`${this.baseHistorico}/usedRange(valuesOnly=true)?$select=values`);
    const linhas = (dados.values || []).slice(1);

    const mapa = new Map();
    for (const linha of linhas) {
      const [quando, , chaveLinha] = linha;
      const k = String(chaveLinha || '');
      if (!k || !quando) continue;
      const atual = mapa.get(k);
      if (!atual || new Date(quando) < new Date(atual)) mapa.set(k, quando);
    }
    return mapa;
  }
}

/** Escapa cada trecho do caminho separadamente - preserva as barras como separador. */
function codificarCaminho(caminho) {
  return caminho.split('/').map(encodeURIComponent).join('/');
}

/** Erro cru do Graph traduzido, especifico pro fluxo de criar pasta/enviar documento. */
function traduzirErroPasta(status, corpo) {
  if (status === 401 || status === 403) {
    return 'Sem permissão para criar a pasta. Confirme se sua conta tem acesso à área '
      + 'DOCUMENTOS_INTEGRACAO no SharePoint.';
  }
  if (status === 404) {
    return 'A pasta base (DOCUMENTOS_INTEGRACAO) não foi encontrada — confira a configuração em js/config.js.';
  }
  if (status === 423) {
    return 'Um dos arquivos está bloqueado para edição no SharePoint. Tente de novo em alguns instantes.';
  }
  if (status === 429 || status === 503) {
    return 'O SharePoint está limitando as requisições. Aguarde alguns segundos e tente de novo.';
  }
  let detalhe = '';
  try { detalhe = JSON.parse(corpo)?.error?.message || ''; } catch { /* corpo nao-JSON */ }
  return `Erro ${status} ao falar com o SharePoint${detalhe ? ': ' + detalhe : '.'}`;
}

/** Converte o erro cru do Graph em algo que o ADM consiga agir. */
function traduzirErro(status, corpo) {
  if (status === 401 || status === 403) {
    return 'Sem permissão para abrir a planilha. Confirme se sua conta tem acesso à pasta '
      + 'PROJETOS_IA/ADM no SharePoint e se o aplicativo foi aprovado pelo administrador.';
  }
  if (status === 404) {
    return 'A planilha não foi encontrada. Ela pode ter sido movida ou excluída — '
      + 'confira o caminho configurado em js/config.js.';
  }
  if (status === 423) {
    return 'A planilha está bloqueada para edição. Feche o arquivo no Excel para liberar a gravação.';
  }
  if (status === 429 || status === 503) {
    return 'O SharePoint está limitando as requisições. Aguarde alguns segundos e tente de novo.';
  }
  let detalhe = '';
  try { detalhe = JSON.parse(corpo)?.error?.message || ''; } catch { /* corpo nao-JSON */ }
  return `Erro ${status} ao falar com o SharePoint${detalhe ? ': ' + detalhe : '.'}`;
}
