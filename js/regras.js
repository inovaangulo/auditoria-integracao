/**
 * Regras de negocio que a planilha resolvia em formula (colunas K, N, O, Q, R, T, U, V, AE, AF).
 *
 * Ficam aqui, isoladas da interface e da fonte de dados, porque sao a parte que
 * o usuario mais revisa: se o prazo mudar, muda so' este arquivo.
 */

import { documentosDoVinculo, PARAMETROS } from './schema.js';

// ---------------------------------------------------------------------------
// Datas
// ---------------------------------------------------------------------------

/**
 * Aceita Date, ISO ("2026-06-01"), dd/mm/aaaa e o serial numerico do Excel.
 * Retorna null quando nao da' pra interpretar - o chamador trata como "sem data",
 * que e' diferente de "data zero" e nao pode virar um alerta falso.
 */
export function parseData(valor) {
  if (valor == null || valor === '') return null;
  if (valor instanceof Date) return isNaN(valor) ? null : valor;

  if (typeof valor === 'number') {
    // Serial do Excel: dia 1 = 01/01/1900, com o bug historico do ano bissexto de 1900.
    const ms = (valor - 25569) * 86400 * 1000;
    const d = new Date(ms);
    return isNaN(d) ? null : d;
  }

  const texto = String(valor).trim();
  const br = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) return new Date(+br[3], +br[2] - 1, +br[1]);

  const d = new Date(texto);
  return isNaN(d) ? null : d;
}

const UM_DIA = 86400000;

function meiaNoite(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// ---------------------------------------------------------------------------
// Feriados nacionais
// ---------------------------------------------------------------------------
// So' feriados nacionais - feriados municipais variam por contrato/cidade
// (a planilha atende clientes em varios estados) e exigiriam um calendario
// por contrato, que nao existe hoje. Ajustar aqui se um dia for preciso.

/** Domingo de Pascoa do ano, pelo algoritmo de Gauss/Meeus. */
function pascoa(ano) {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

function isoData(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function somarDias(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/**
 * Feriados nacionais do ano (fixos + moveis a partir da Pascoa). Carnaval e
 * Corpus Christi nao sao feriado nacional por lei, mas o expediente costuma
 * fechar mesmo assim - incluidos porque refletem melhor a pratica real.
 */
function feriadosNacionais(ano) {
  const p = pascoa(ano);
  const fixos = [[0, 1], [3, 21], [4, 1], [8, 7], [9, 12], [10, 2], [10, 15], [10, 20], [11, 25]]
    .map(([mes, dia]) => isoData(new Date(ano, mes, dia)));
  const moveis = [
    isoData(somarDias(p, -47)), // Carnaval (segunda)
    isoData(somarDias(p, -46)), // Carnaval (terca)
    isoData(somarDias(p, -2)),  // Sexta-feira Santa
    isoData(somarDias(p, 60)),  // Corpus Christi
  ];
  return new Set([...fixos, ...moveis]);
}

const cacheFeriados = new Map();

function ehFeriadoNacional(d) {
  const ano = d.getFullYear();
  if (!cacheFeriados.has(ano)) cacheFeriados.set(ano, feriadosNacionais(ano));
  return cacheFeriados.get(ano).has(isoData(d));
}

/** Dias corridos entre duas datas (ignora horario). */
export function diasCorridos(de, ate = new Date()) {
  const inicio = parseData(de);
  if (!inicio) return null;
  return Math.floor((meiaNoite(ate) - meiaNoite(inicio)) / UM_DIA);
}

/** Dias uteis (seg-sex, descontando feriados nacionais) entre duas datas. */
export function diasUteis(de, ate = new Date()) {
  const inicio = parseData(de);
  if (!inicio) return null;
  let cursor = meiaNoite(inicio);
  const fim = meiaNoite(ate);
  let n = 0;
  while (cursor < fim) {
    cursor = new Date(cursor.getTime() + UM_DIA);
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6 && !ehFeriadoNacional(cursor)) n++;
  }
  return n;
}

export function formatarData(valor) {
  const d = parseData(valor);
  return d ? d.toLocaleDateString('pt-BR') : '';
}

/** Valor para <input type="date">. */
export function paraInputDate(valor) {
  const d = parseData(valor);
  if (!d) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Documentos
// ---------------------------------------------------------------------------

/**
 * Um documento esta' resolvido quando foi Recebido ou nao se aplica aquele caso.
 * Vazio conta como pendente: e' o estado inicial da planilha e precisa aparecer
 * como falta, senao um cadastro recem-criado nasceria "completo".
 */
function resolvido(valor) {
  const v = (valor || '').trim();
  return v === 'Recebido' || v === 'Não se aplica';
}

/** Documentos obrigatorios ainda em aberto (condicionais nao entram). */
export function documentosFaltantes(reg) {
  return documentosDoVinculo(reg['Tipo'])
    .filter((d) => !d.condicional && !resolvido(reg[d.campo]))
    .map((d) => d.label);
}

export function contagemDocumentos(reg) {
  const docs = documentosDoVinculo(reg['Tipo']);
  const conta = { recebido: 0, pendente: 0, naoSeAplica: 0, total: docs.length };
  for (const d of docs) {
    const v = (reg[d.campo] || '').trim();
    if (v === 'Recebido') conta.recebido++;
    else if (v === 'Não se aplica') conta.naoSeAplica++;
    else conta.pendente++;
  }
  return conta;
}

// ---------------------------------------------------------------------------
// Recalculo das colunas derivadas
// ---------------------------------------------------------------------------

/**
 * Colunas que recalcular() sobrescreve sempre, so' a partir de outros campos
 * e da data de hoje - mudam sozinhas com o tempo, mesmo sem ninguem editar
 * nada. Quem compara duas leituras pra detectar edicao simultanea (dados/
 * index.js) precisa ignorar essas, senao qualquer salvamento seria acusado
 * de "conflito" so' porque um dia passou entre as duas leituras.
 */
export const CAMPOS_DERIVADOS = [
  'CPF (só números)', 'CNPJ (só números)', 'Documentos completos?',
  'Dias aguardando assinatura', 'Alerta cobrança assinatura',
  'Dias sem confirmação (PJ)', 'Alerta confirmação pendente (PJ)',
  'Dias sem confirmação', 'Situação prazo Wehandle', 'Consistência do status',
];

/**
 * Devolve uma copia do registro com as colunas calculadas atualizadas.
 * Puro de proposito: a tela chama isso a cada edicao sem se preocupar com ordem.
 */
export function recalcular(reg, hoje = new Date()) {
  const r = { ...reg };
  const tipo = (r['Tipo'] || '').trim();
  const status = (r['Status atual'] || '').trim();

  r['CPF (só números)'] = String(r['CPF'] || '').replace(/\D/g, '');
  r['CNPJ (só números)'] = String(r['CNPJ (se PJ)'] || '').replace(/\D/g, '');

  const faltantes = documentosFaltantes(r);
  r['Documentos completos?'] = faltantes.length === 0 ? 'SIM' : '';

  // Assinatura: depois de aprovado nao ha' o que cobrar, entao a contagem zera.
  if (status === 'Aprovado') {
    r['Dias aguardando assinatura'] = 0;
    r['Alerta cobrança assinatura'] = '';
  } else {
    const dias = diasCorridos(r['Data envio p/ assinatura'], hoje);
    r['Dias aguardando assinatura'] = dias ?? '';
    r['Alerta cobrança assinatura'] =
      dias != null && dias >= PARAMETROS.limiteAlertaAssinaturaDias ? 'COBRAR ASSINATURA' : '';
  }

  // Confirmacao da empresa no Wehandle: so' faz sentido para PJ.
  if (tipo === 'PJ' && status !== 'Aprovado') {
    const diasPj = diasCorridos(r['Data cadastro empresa Wehandle (PJ)'], hoje);
    r['Dias sem confirmação (PJ)'] = diasPj ?? '';
    r['Alerta confirmação pendente (PJ)'] =
      diasPj != null && diasPj >= PARAMETROS.limiteAlertaConfirmacaoPjDias ? 'COBRAR CONFIRMAÇÃO' : '';
  } else {
    r['Dias sem confirmação (PJ)'] = '';
    r['Alerta confirmação pendente (PJ)'] = '';
  }

  // SLA da analise Wehandle, contado em dias uteis.
  if (status === 'Aprovado' || status === 'Reprovado - em correção') {
    r['Dias sem confirmação'] = '';
    r['Situação prazo Wehandle'] = 'Concluído';
  } else {
    const uteis = diasUteis(r['Data envio p/ análise Wehandle'], hoje);
    r['Dias sem confirmação'] = uteis ?? '';
    if (uteis == null) r['Situação prazo Wehandle'] = '';
    else if (uteis > PARAMETROS.slaAnaliseWehandleDiasUteis) r['Situação prazo Wehandle'] = 'Fora do prazo';
    else r['Situação prazo Wehandle'] = 'No prazo';
  }

  r['Consistência do status'] = consistencia(r);
  return r;
}

/**
 * Aponta contradicoes entre o status declarado e a documentacao real.
 * E' aviso, nao trava: quem decide se o cadastro segue e' o ADM.
 */
function consistencia(r) {
  const status = (r['Status atual'] || '').trim();
  const completos = r['Documentos completos?'] === 'SIM';

  if (status === 'Aprovado' && !completos) {
    return 'Inconsistente: aprovado com documento pendente';
  }
  if (status === 'Aguardando assinatura' && !completos) {
    return 'Atenção: enviado para assinatura sem documentação completa';
  }
  if (!status) return 'Sem status definido';
  return status;
}

// ---------------------------------------------------------------------------
// Alertas do cartao
// ---------------------------------------------------------------------------

/** Alertas ativos do registro, do mais grave para o menos. */
export function alertas(reg) {
  const r = recalcular(reg);
  const lista = [];

  if (String(r['Consistência do status']).startsWith('Inconsistente')) {
    lista.push({ nivel: 'critico', texto: r['Consistência do status'] });
  }
  if (r['Alerta verificação de conteúdo']) {
    // Nivel proprio ("revisar"), nao "critico"/"atencao" - e' pendencia de
    // conferencia manual (possivel erro humano), nao urgencia de prazo, e a
    // Sara pediu para essas cores nao se misturarem.
    lista.push({
      nivel: 'revisar',
      texto: `Conferir documento(s) — nome não encontrado no conteúdo: ${r['Alerta verificação de conteúdo']}`,
    });
  }
  if (r['Alerta cobrança assinatura']) {
    lista.push({
      nivel: 'critico',
      texto: `Cobrar assinatura — ${r['Dias aguardando assinatura']} dias aguardando`,
    });
  }
  if (r['Alerta confirmação pendente (PJ)']) {
    lista.push({
      nivel: 'atencao',
      texto: `Cobrar confirmação da empresa — ${r['Dias sem confirmação (PJ)']} dias`,
    });
  }
  if (r['Situação prazo Wehandle'] === 'Fora do prazo') {
    lista.push({
      nivel: 'atencao',
      texto: `Análise Wehandle fora do prazo — ${r['Dias sem confirmação']} dias úteis`,
    });
  }
  if (String(r['Consistência do status']).startsWith('Atenção')) {
    lista.push({ nivel: 'atencao', texto: r['Consistência do status'] });
  }
  return lista;
}
