/** Ponto de entrada: liga os controles da pagina ao estado e as telas. */

import { CONFIG, MODO_SHAREPOINT } from './config.js';
import * as dados from './dados/index.js';
import * as kanban from './telas/kanban.js';
import * as dashboard from './telas/dashboard.js';
import * as lista from './telas/lista.js';
import * as detalhe from './telas/detalhe.js';
import * as geradorPasta from './telas/gerador-pasta.js';
import { RESPONSAVEIS_ADM } from './schema.js';
import { el, limpar } from './ui.js';

/** Nome da pessoa pelo e-mail (RESPONSAVEIS_ADM); mostra o próprio e-mail se não achar. */
function nomeDoResponsavel(email) {
  return RESPONSAVEIS_ADM.find((p) => p.email === email)?.nome || email;
}

const nos = {};
let abaAtiva = 'Kanban';

function pegarNos() {
  const ids = [
    'rotuloFonte', 'btnConectar', 'btnImportar', 'btnExportar', 'btnAtualizar',
    'faixaAviso', 'filtroBusca', 'filtroCliente', 'filtroResponsavel', 'filtroTipo', 'filtroAlerta',
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

/**
 * Faixa fixa "nova versão disponível" - não some sozinha, só ao clicar em
 * Atualizar. Também bloqueia gravação/exclusão (dados.bloquearPorAtualizacao)
 * até a página ser recarregada - pedido da Sara: ninguém deve continuar
 * editando com uma versão desatualizada enquanto não recarrega.
 */
function mostrarAvisoAtualizacao() {
  dados.bloquearPorAtualizacao();
  limpar(nos.faixaAviso);
  nos.faixaAviso.hidden = false;
  nos.faixaAviso.style.borderLeftColor = '#2e7d5b';
  nos.faixaAviso.style.background = '#e7f4ee';
  nos.faixaAviso.style.color = '#1e5a3f';
  nos.faixaAviso.append(el('div', { style: 'display:flex;align-items:center;gap:12px;flex-wrap:wrap;' }, [
    '🔄 Uma versão mais nova do app está disponível — edição bloqueada até recarregar.',
    el('button', {
      class: 'btn-topo',
      style: 'background:#2e7d5b;',
      texto: 'Atualizar agora',
      onclick: () => window.location.reload(),
    }),
  ]));
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
  atualizarFiltroResponsavel();

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

function atualizarFiltroResponsavel() {
  const opcoes = dados.responsaveis();
  const atual = nos.filtroResponsavel.value;
  const jaTem = [...nos.filtroResponsavel.options].slice(1).map((o) => o.value);
  if (jaTem.join('|') === opcoes.join('|')) return;

  limpar(nos.filtroResponsavel);
  nos.filtroResponsavel.append(el('option', { value: '', texto: 'Todos' }));
  // Mostra o nome (RESPONSAVEIS_ADM) - o valor que de fato filtra continua sendo
  // o e-mail, que é o que a planilha guarda e pra onde o alerta é enviado.
  for (const r of opcoes) nos.filtroResponsavel.append(el('option', { value: r, texto: nomeDoResponsavel(r) }));
  nos.filtroResponsavel.value = opcoes.includes(atual) ? atual : '';
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
  nos.filtroResponsavel.addEventListener('change', () => dados.definirFiltro('responsavel', nos.filtroResponsavel.value));
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

// Service worker minimo, so' para o navegador oferecer "Instalar app" (cria
// um icone/atalho de verdade pra quem usa no dia a dia) - nao guarda nada
// offline de proposito, os dados vem sempre do SharePoint. Tambem detecta
// quando uma versao nova do app foi publicada e avisa quem esta' com a tela
// aberta - sem isso, a pessoa podia continuar numa versao antiga sem saber
// que uma alteracao pedida ja' tinha sido feita.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then((registro) => {
    registro.addEventListener('updatefound', () => {
      const novo = registro.installing;
      if (!novo) return;
      novo.addEventListener('statechange', () => {
        // "installed" com controller ja' existente = havia uma versao rodando
        // antes desta - e' uma atualizacao de verdade, nao a primeira visita.
        if (novo.state === 'installed' && navigator.serviceWorker.controller) {
          mostrarAvisoAtualizacao();
        }
      });
    });
    // A checagem automatica do navegador so' acontece em certos momentos
    // (ex.: recarregar a pagina) - como esta tela costuma ficar aberta o dia
    // inteiro, confere de novo a cada 5 minutos.
    setInterval(() => registro.update(), 5 * 60 * 1000);
  }).catch(() => {
    /* instalabilidade e' so' um extra - se falhar, o app continua normal */
  });
}

// version.json e' o sinal principal de "tem versao nova": o service worker so'
// detecta troca no PROPRIO arquivo sw.js, entao nao pega mudanca em outro
// lugar do app. version.json e' atualizado a cada publicacao (mesmo commit da
// mudanca em si) - se o valor mudar, e' porque saiu uma versao nova.
(function conferirVersao() {
  let versaoInicial = null;
  async function checar() {
    try {
      const { v } = await fetch('version.json', { cache: 'no-store' }).then((r) => r.json());
      if (versaoInicial === null) { versaoInicial = v; return; }
      if (v !== versaoInicial) mostrarAvisoAtualizacao();
    } catch {
      /* checagem de versao e' so' um extra - falha aqui nao pode afetar o app */
    }
  }
  checar();
  setInterval(checar, 5 * 60 * 1000);
})();
