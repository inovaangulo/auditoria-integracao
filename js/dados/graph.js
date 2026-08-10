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
import { linhaParaRegistro, registroParaLinha } from './planilha.js';
import { COLUNAS } from '../schema.js';

const CDN_MSAL = 'https://cdn.jsdelivr.net/npm/@azure/msal-browser@3/lib/msal-browser.min.js';
const GRAFO = 'https://graph.microsoft.com/v1.0';

/** Ultima coluna da tabela (46 colunas = AT). Derivada para nao desalinhar se COLUNAS mudar. */
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

  async chamar(url, opcoes = {}) {
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
      throw new Error(traduzirErro(resp.status, corpo));
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
      if (!String(linha[0] || '').trim()) return;  // sem nome nao e' cadastro
      const reg = linhaParaRegistro(linha);
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
