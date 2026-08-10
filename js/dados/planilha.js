/**
 * Conversao entre a planilha (linhas posicionais) e os registros do app (objetos).
 *
 * Usada tanto pelo adaptador local (arquivo .xlsx que o usuario importa) quanto
 * pelo adaptador do SharePoint (linhas devolvidas pela API do Graph), porque nos
 * dois casos a linha chega como array na ordem de COLUNAS.
 */

import { COLUNAS } from '../schema.js';

const CDN_SHEETJS = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';

let promessaSheetJs = null;

/** Carrega o SheetJS sob demanda - so' quem importa/exporta paga o download. */
export function carregarSheetJs() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  if (!promessaSheetJs) {
    promessaSheetJs = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = CDN_SHEETJS;
      s.onload = () => resolve(window.XLSX);
      s.onerror = () => {
        promessaSheetJs = null;  // permite nova tentativa se a rede voltar
        reject(new Error('Não foi possível carregar a biblioteca de planilhas. Verifique a conexão.'));
      };
      document.head.appendChild(s);
    });
  }
  return promessaSheetJs;
}

/** Normaliza celula da planilha para o que o app manipula (texto ou Date). */
function normalizar(valor) {
  if (valor == null) return '';
  if (valor instanceof Date) return valor;
  if (typeof valor === 'number') return valor;
  return String(valor).trim();
}

/** Linha posicional -> registro. Colunas ausentes viram string vazia. */
export function linhaParaRegistro(linha) {
  const reg = {};
  COLUNAS.forEach((coluna, i) => { reg[coluna] = normalizar(linha[i]); });
  return reg;
}

/** Registro -> linha posicional, na ordem exata de COLUNAS. */
export function registroParaLinha(reg) {
  return COLUNAS.map((coluna) => {
    const v = reg[coluna];
    if (v == null) return '';
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    return v;
  });
}

export function linhasParaRegistros(linhas) {
  return linhas
    .map(linhaParaRegistro)
    .filter((r) => String(r['Nome completo'] || '').trim() !== '');
}

/**
 * Le um arquivo .xlsx e devolve os registros da aba de cadastro.
 * Mantem as demais abas intactas em `pastaOriginal` para que a exportacao
 * devolva a planilha completa, e nao so' a aba que o app usa.
 */
export async function lerArquivo(arquivo, nomeAba) {
  const XLSX = await carregarSheetJs();
  const buffer = await arquivo.arrayBuffer();
  const pasta = XLSX.read(buffer, { cellDates: true });

  const aba = pasta.Sheets[nomeAba];
  if (!aba) {
    throw new Error(
      `A planilha não tem a aba "${nomeAba}". Abas encontradas: ${pasta.SheetNames.join(', ')}.`
    );
  }

  // header:1 devolve arrays posicionais; defval mantem as colunas vazias no lugar.
  const linhas = XLSX.utils.sheet_to_json(aba, { header: 1, defval: '', raw: false, cellDates: true });
  const corpo = linhas.slice(1);  // descarta o cabecalho

  return { registros: linhasParaRegistros(corpo), pastaOriginal: pasta };
}

/**
 * Gera o .xlsx de volta. Se recebeu a pasta original na importacao, reescreve
 * apenas a aba de cadastro e preserva Instruções, CLT, PJ e Parâmetros.
 */
export async function gerarArquivo(registros, nomeAba, pastaOriginal) {
  const XLSX = await carregarSheetJs();
  const matriz = [COLUNAS, ...registros.map(registroParaLinha)];
  const aba = XLSX.utils.aoa_to_sheet(matriz);

  const pasta = pastaOriginal || XLSX.utils.book_new();
  if (pastaOriginal) {
    pasta.Sheets[nomeAba] = aba;
    if (!pasta.SheetNames.includes(nomeAba)) pasta.SheetNames.push(nomeAba);
  } else {
    XLSX.utils.book_append_sheet(pasta, aba, nomeAba);
  }

  return XLSX.write(pasta, { bookType: 'xlsx', type: 'array' });
}

export function baixar(dados, nomeArquivo) {
  const blob = new Blob([dados], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
