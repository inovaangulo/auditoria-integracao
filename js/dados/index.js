/**
 * Estado central do app: escolhe a fonte de dados, guarda os registros em
 * memoria, aplica filtros e mantem o historico de alteracoes.
 *
 * As telas nunca falam com o SharePoint nem com o localStorage direto - so' com
 * este modulo. E' o que permite trocar a fonte sem reescrever a interface.
 */

import { CONFIG, MODO_SHAREPOINT } from '../config.js';
import { FonteLocal } from './local.js';
import { FonteSharePoint } from './graph.js';
import { recalcular, alertas, documentosFaltantes } from '../regras.js';
import { colunaDoStatus } from '../schema.js';

const CHAVE_HISTORICO = 'auditoria_integracao::historico';

export const estado = {
  fonte: null,
  usuario: null,
  conectado: false,
  registros: [],
  filtros: { busca: '', cliente: '', tipo: '', alerta: '' },
};

const ouvintes = new Set();

export function aoMudar(fn) { ouvintes.add(fn); return () => ouvintes.delete(fn); }
function notificar() { ouvintes.forEach((fn) => fn()); }

// ---------------------------------------------------------------------------
// Ciclo de vida
// ---------------------------------------------------------------------------

export async function iniciar() {
  estado.fonte = MODO_SHAREPOINT ? new FonteSharePoint() : new FonteLocal();
  const r = await estado.fonte.iniciar();
  estado.conectado = r.conectado;
  estado.usuario = r.usuario;
  if (estado.conectado) await recarregar();
  notificar();
}

export async function conectar() {
  const r = await estado.fonte.conectar();
  estado.conectado = r.conectado;
  estado.usuario = r.usuario;
  await recarregar();
  notificar();
}

export async function recarregar() {
  const brutos = await estado.fonte.carregar();
  // Recalcula na leitura: a planilha pode ter sido editada no Excel sem as
  // formulas atualizadas, e o app nao deve exibir prazo velho.
  estado.registros = brutos.map((r) => recalcular(r));
  notificar();
}

// ---------------------------------------------------------------------------
// Gravacao
// ---------------------------------------------------------------------------

/**
 * Grava um registro editado. `original` e' a versao anterior, usada para montar
 * o historico com o que de fato mudou.
 */
export async function salvarRegistro(editado, original) {
  const atualizado = recalcular(editado);

  const i = estado.registros.findIndex((r) => chave(r) === chave(atualizado));
  if (i >= 0) estado.registros[i] = atualizado;
  else estado.registros.push(atualizado);

  if (estado.fonte.salvarRegistro) {
    await estado.fonte.salvarRegistro(atualizado);
  } else {
    await estado.fonte.salvar(estado.registros);
  }

  if (original) registrarHistorico(atualizado, original);
  notificar();
  return atualizado;
}

/** Muda so' o status - usado ao arrastar o cartao entre colunas do Kanban. */
export async function mudarStatus(reg, novoStatus) {
  if ((reg['Status atual'] || '') === novoStatus) return reg;
  const original = { ...reg };
  return salvarRegistro({ ...reg, 'Status atual': novoStatus }, original);
}

/** Identidade do registro: CPF/CNPJ quando houver, senao o nome. */
export function chave(reg) {
  const doc = String(reg['CPF'] || reg['CNPJ (se PJ)'] || '').replace(/\D/g, '');
  return doc || String(reg['Nome completo'] || '').trim().toLowerCase();
}

// ---------------------------------------------------------------------------
// Historico
// ---------------------------------------------------------------------------
// Guardado no navegador. No modo SharePoint isso significa que o historico e'
// por maquina, nao compartilhado - a rastreabilidade completa exige uma aba de
// log na planilha, prevista como proximo passo.

function lerHistorico() {
  try { return JSON.parse(localStorage.getItem(CHAVE_HISTORICO) || '{}'); }
  catch { return {}; }
}

export function historicoDe(reg) {
  return lerHistorico()[chave(reg)] || [];
}

function registrarHistorico(novo, antigo) {
  const mudancas = [];
  for (const campo of Object.keys(novo)) {
    if (campo.startsWith('__')) continue;
    const de = String(antigo[campo] ?? '');
    const para = String(novo[campo] ?? '');
    if (de !== para) mudancas.push({ campo, de, para });
  }
  if (!mudancas.length) return;

  const todos = lerHistorico();
  const k = chave(novo);
  const entrada = {
    quando: new Date().toISOString(),
    quem: estado.usuario || 'usuário local',
    mudancas,
  };
  todos[k] = [entrada, ...(todos[k] || [])].slice(0, CONFIG.limiteHistorico);

  try { localStorage.setItem(CHAVE_HISTORICO, JSON.stringify(todos)); }
  catch { /* historico e' acessorio: se o storage encher, nao bloqueia o salvamento */ }
}

// ---------------------------------------------------------------------------
// Filtros e consultas
// ---------------------------------------------------------------------------

export function definirFiltro(nome, valor) {
  estado.filtros[nome] = valor;
  notificar();
}

function normalizar(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function registrosFiltrados() {
  const { busca, cliente, tipo, alerta } = estado.filtros;
  const termo = normalizar(busca).trim();

  return estado.registros.filter((r) => {
    if (cliente && r['Cliente atual'] !== cliente) return false;
    if (tipo && r['Tipo'] !== tipo) return false;

    if (alerta === 'alerta' && alertas(r).length === 0) return false;
    if (alerta === 'incompleto' && r['Documentos completos?'] === 'SIM') return false;
    if (alerta === 'completo' && r['Documentos completos?'] !== 'SIM') return false;

    if (termo) {
      const alvo = normalizar([
        r['Nome completo'], r['CPF'], r['CNPJ (se PJ)'], r['Cargo / Função'], r['Responsável ADM'],
      ].join(' '));
      if (!alvo.includes(termo)) return false;
    }
    return true;
  });
}

export function porColuna() {
  const mapa = {};
  for (const r of registrosFiltrados()) {
    const c = colunaDoStatus(r['Status atual']);
    (mapa[c] ||= []).push(r);
  }
  return mapa;
}

export function clientes() {
  return [...new Set(estado.registros.map((r) => r['Cliente atual']).filter(Boolean))].sort();
}

export { alertas, documentosFaltantes };
