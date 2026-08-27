/**
 * Visao em tabela — a alternativa textual ao Kanban.
 *
 * Alem de servir a quem prefere buscar numa lista, garante que toda informacao
 * codificada por cor no quadro exista tambem como texto.
 */

import { registrosFiltrados, alertas, documentosFaltantes, dataEntradaDe, estado } from '../dados/index.js';
import { formatarData } from '../regras.js';
import { el, limpar, documentoDe, abrirPastaColaborador } from '../ui.js';

let aoAbrirDetalhe = () => {};

export function configurar({ abrirDetalhe }) {
  aoAbrirDetalhe = abrirDetalhe;
}

// "Pasta" so' entra se a fonte suportar (SharePoint conectado) - no modo
// local nao ha' o que abrir.
function colunasTabela() {
  const base = [
    'Colaborador', 'Documento', 'Vínculo', 'Cliente', 'Cargo', 'Entrada',
    'Status', 'Documentação', 'Faltando', 'Alertas', 'Envio assinatura', 'Responsável',
  ];
  return estado.fonte?.acharPastaColaborador ? [...base, 'Pasta'] : base;
}

function pilula(texto, fundo, cor) {
  return el('span', { class: 'pilula', style: `background:${fundo};color:${cor}`, texto });
}

export function renderizar(container) {
  const regs = registrosFiltrados();
  limpar(container);

  if (!regs.length) {
    container.append(el('div', { class: 'mensagem-vazia', texto: 'Nenhum colaborador para exibir com os filtros atuais.' }));
    return;
  }

  const corpo = el('tbody');
  for (const r of regs) {
    const faltando = documentosFaltantes(r);
    const listaAlertas = alertas(r);
    const completo = r['Documentos completos?'] === 'SIM';

    const linha = el('tr', { tabindex: '0' }, [
      el('td', {}, [el('b', { texto: r['Nome completo'] })]),
      el('td', { texto: documentoDe(r) }),
      el('td', { texto: r['Tipo'] || '—' }),
      el('td', { texto: r['Cliente atual'] || '—' }),
      el('td', { texto: r['Cargo / Função'] || '—' }),
      el('td', { texto: dataEntradaDe(r)?.toLocaleDateString('pt-BR') || '—' }),
      el('td', { texto: r['Status atual'] || '—' }),
      el('td', {}, [completo
        ? pilula('Completa', '#e7f4ee', '#2e7d5b')
        : pilula('Incompleta', '#fbeceb', '#8f1c20')]),
      el('td', { texto: faltando.length ? String(faltando.length) : '—', title: faltando.join('\n') }),
      el('td', {}, [listaAlertas.length
        ? pilula(String(listaAlertas.length), '#fbf1da', '#7a5a08')
        : el('span', { texto: '—' })]),
      el('td', { texto: formatarData(r['Data envio p/ assinatura']) || '—' }),
      el('td', { texto: r['Responsável ADM'] || '—' }),
      estado.fonte?.acharPastaColaborador
        ? el('td', {}, [el('button', {
            class: 'botao-pasta-lista', type: 'button', title: 'Abrir pasta no SharePoint',
            'aria-label': 'Abrir pasta no SharePoint', texto: '📁',
            onclick: (e) => { e.stopPropagation(); abrirPastaColaborador(r, estado.fonte); },
          })])
        : null,
    ]);

    linha.addEventListener('click', () => aoAbrirDetalhe(r));
    linha.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); aoAbrirDetalhe(r); }
    });
    corpo.append(linha);
  }

  container.append(
    el('div', { class: 'tabela-rolagem' }, [
      el('table', { class: 'lista' }, [
        el('thead', {}, [el('tr', {}, colunasTabela().map((c) => el('th', { texto: c })))]),
        corpo,
      ]),
    ])
  );
}
