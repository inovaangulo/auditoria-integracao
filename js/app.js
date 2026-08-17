/** Ponto de entrada: liga os controles da pagina ao estado e as telas. */

import { CONFIG, MODO_SHAREPOINT } from './config.js';
import * as dados from './dados/index.js';
import * as kanban from './telas/kanban.js';
import * as dashboard from './telas/dashboard.js';
import * as lista from './telas/lista.js';
import * as detalhe from './telas/detalhe.js';
import * as geradorPasta from './telas/gerador-pasta.js';
import { el, limpar } from './ui.js';

const nos = {};
let abaAtiva = 'Kanban';

function pegarNos() {
  const ids = [
    'rotuloFonte', 'btnConectar', 'btnImportar', 'btnExportar', 'btnAtualizar',
    'faixaAviso', 'filtroBusca', 'filtroCliente', 'filtroTipo', 'filtroAlerta',
    'contadorGeral', 'carregando', 'kanban', 'painelKanban', 'painelDashboard',
    'painelLista', 'abaKanban', 'abaDashboard', 'abaLista', 'inputArquivo',
    'btnGeradorPasta',
  ];
  for (const id of ids) nos[id] = document.getElementById(id);
}

// ---------------------------------------------------------------------------
// Mensagens
// ---------------------------------------------------------------------------

function avisar(texto, { erro = false } = {}) {
  limpar(nos.faixaAviso);
  if (!texto) { nos.faixaAviso.hidden = true; return; }
  nos.faixaAviso.hidden = false;
  nos.faixaAviso.style.borderLeftColor = erro ? '#c1272d' : '#b7860b';
  nos.faixaAviso.style.background = erro ? '#fbeceb' : '#fbf1da';
  nos.faixaAviso.style.color = erro ? '#8f1c20' : '#7a5a08';
  nos.faixaAviso.append(texto);
}

function mostrarErro(mensagem) {
  avisar(mensagem, { erro: true });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/** Aviso permanente do modo local — a limitação precisa ficar à vista. */
function avisoDeModo() {
  if (MODO_SHAREPOINT) return;
  limpar(nos.faixaAviso);
  nos.faixaAviso.hidden = false;
  nos.faixaAviso.style.borderLeftColor = '#b7860b';
  nos.faixaAviso.style.background = '#fbf1da';
  nos.faixaAviso.style.color = '#7a5a08';
  nos.faixaAviso.append(
    'Modo local: os dados ficam só neste navegador e não são compartilhados com a equipe. '
    + 'Importe a planilha para começar e exporte ao terminar. '
    + 'Para gravar direto no SharePoint, configure o clientId em js/config.js.'
  );
}

// ---------------------------------------------------------------------------
// Abas
// ---------------------------------------------------------------------------

function trocarAba(nome) {
  abaAtiva = nome;
  const mapa = {
    Kanban: [nos.abaKanban, nos.painelKanban],
    Dashboard: [nos.abaDashboard, nos.painelDashboard],
    Lista: [nos.abaLista, nos.painelLista],
  };
  for (const [chave, [aba, painel]] of Object.entries(mapa)) {
    const ativo = chave === nome;
    aba.setAttribute('aria-selected', String(ativo));
    painel.hidden = !ativo;
  }
  renderizar();
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function renderizar() {
  const total = dados.estado.registros.length;
  const visiveis = dados.registrosFiltrados().length;

  nos.carregando.hidden = true;
  nos.contadorGeral.textContent = total
    ? `${visiveis} de ${total} colaboradores`
    : '';

  atualizarFiltroCliente();

  if (!total) {
    nos.kanban.hidden = true;
    nos.carregando.hidden = false;
    nos.carregando.textContent = MODO_SHAREPOINT && !dados.estado.conectado
      ? 'Entre com a conta Ângulo para carregar a planilha.'
      : 'Nenhum colaborador cadastrado. Use "Importar planilha" para carregar a base.';
    return;
  }

  nos.kanban.hidden = abaAtiva !== 'Kanban';
  if (abaAtiva === 'Kanban') kanban.renderizar(nos.kanban);
  else if (abaAtiva === 'Dashboard') dashboard.renderizar(nos.painelDashboard);
  else lista.renderizar(nos.painelLista);
}

function atualizarFiltroCliente() {
  const opcoes = dados.clientes();
  const atual = nos.filtroCliente.value;
  // Só reconstrói quando a lista mudou, para não perder a seleção a cada render.
  const jaTem = [...nos.filtroCliente.options].slice(1).map((o) => o.value);
  if (jaTem.join('|') === opcoes.join('|')) return;

  limpar(nos.filtroCliente);
  nos.filtroCliente.append(el('option', { value: '', texto: 'Todos' }));
  for (const c of opcoes) nos.filtroCliente.append(el('option', { value: c, texto: c }));
  nos.filtroCliente.value = opcoes.includes(atual) ? atual : '';
}

function atualizarCabecalho() {
  const { fonte, conectado, usuario } = dados.estado;
  nos.rotuloFonte.textContent = usuario ? `${fonte.nome} · ${usuario}` : fonte.nome;

  nos.btnConectar.hidden = !MODO_SHAREPOINT || conectado;
  nos.btnAtualizar.hidden = !MODO_SHAREPOINT || !conectado;
  // No modo SharePoint a planilha é a fonte: importar por arquivo criaria uma
  // segunda verdade, então some. Exportar continua útil para tirar um retrato.
  nos.btnImportar.hidden = MODO_SHAREPOINT;
}

// ---------------------------------------------------------------------------
// Ações
// ---------------------------------------------------------------------------

async function importar(arquivo) {
  try {
    avisar('Lendo a planilha…');
    await dados.estado.fonte.importar(arquivo);
    await dados.recarregar();
    avisoDeModo();
  } catch (err) {
    mostrarErro(err.message);
  }
}

async function exportar() {
  try {
    await dados.estado.fonte.exportar(dados.estado.registros);
  } catch (err) {
    mostrarErro(err.message);
  }
}

async function conectar() {
  try {
    avisar('Abrindo o login da Microsoft…');
    await dados.conectar();
    avisar('');
  } catch (err) {
    mostrarErro(err.message);
  }
}

async function atualizar() {
  try {
    avisar('Recarregando a planilha…');
    await dados.recarregar();
    avisar('');
  } catch (err) {
    mostrarErro(err.message);
  }
}

// ---------------------------------------------------------------------------
// Início
// ---------------------------------------------------------------------------

function ligarEventos() {
  nos.abaKanban.addEventListener('click', () => trocarAba('Kanban'));
  nos.abaDashboard.addEventListener('click', () => trocarAba('Dashboard'));
  nos.abaLista.addEventListener('click', () => trocarAba('Lista'));

  let temporizador;
  nos.filtroBusca.addEventListener('input', () => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => dados.definirFiltro('busca', nos.filtroBusca.value), 180);
  });
  nos.filtroCliente.addEventListener('change', () => dados.definirFiltro('cliente', nos.filtroCliente.value));
  nos.filtroTipo.addEventListener('change', () => dados.definirFiltro('tipo', nos.filtroTipo.value));
  nos.filtroAlerta.addEventListener('change', () => dados.definirFiltro('alerta', nos.filtroAlerta.value));

  nos.btnImportar.addEventListener('click', () => nos.inputArquivo.click());
  nos.inputArquivo.addEventListener('change', () => {
    const arquivo = nos.inputArquivo.files[0];
    if (arquivo) importar(arquivo);
    nos.inputArquivo.value = '';  // permite reimportar o mesmo arquivo
  });
  nos.btnExportar.addEventListener('click', exportar);
  nos.btnConectar.addEventListener('click', conectar);
  nos.btnAtualizar.addEventListener('click', atualizar);
  nos.btnGeradorPasta.addEventListener('click', geradorPasta.abrir);
}

async function iniciar() {
  pegarNos();
  ligarEventos();

  detalhe.configurar({ erro: mostrarErro });
  kanban.configurar({ abrirDetalhe: detalhe.abrir, erro: mostrarErro });
  lista.configurar({ abrirDetalhe: detalhe.abrir });
  geradorPasta.configurar();

  dados.aoMudar(() => { atualizarCabecalho(); renderizar(); });

  try {
    await dados.iniciar();
  } catch (err) {
    mostrarErro(`Não foi possível iniciar: ${err.message}`);
    return;
  }

  avisoDeModo();
  atualizarCabecalho();
  renderizar();
}

document.addEventListener('DOMContentLoaded', iniciar);
