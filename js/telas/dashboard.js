/**
 * Dashboard: numeros de cabeceira + barras de magnitude.
 *
 * Toda barra vem acompanhada de rotulo e valor em texto, entao a cor so' reforca
 * o que ja' esta' escrito - ninguem precisa distinguir matiz para ler o grafico.
 * Por isso nao ha' legenda separada: o rotulo esta' na propria linha.
 */

import { COLUNAS_KANBAN } from '../schema.js';
import { registrosFiltrados, alertas, documentosFaltantes, dataEntradaDe } from '../dados/index.js';
import { contagemDocumentos } from '../regras.js';
import { el, limpar, plural } from '../ui.js';

const COR = {
  vermelho: '#c1272d',
  verde: '#2e7d5b',
  ambar: '#b7860b',
  cinza: '#6b7280',
};

function kpi(valor, rotulo, tom = '') {
  return el('div', { class: `kpi ${tom}` }, [
    el('div', { class: 'valor', texto: String(valor) }),
    el('div', { class: 'rotulo', texto: rotulo }),
  ]);
}

/** Barra horizontal de magnitude: trilho neutro + preenchimento proporcional. */
function barra(rotulo, valor, total, cor) {
  const pct = total > 0 ? Math.round((valor / total) * 100) : 0;
  return el('div', { class: 'barra-linha' }, [
    el('div', { class: 'barra-rotulo' }, [
      el('span', { texto: rotulo }),
      el('span', { texto: `${valor} · ${pct}%` }),
    ]),
    el('div', { class: 'barra-trilho' }, [
      el('div', { class: 'barra-preenche', style: `width:${pct}%;background:${cor}` }),
    ]),
  ]);
}

export function renderizar(container) {
  const regs = registrosFiltrados();
  limpar(container);

  if (!regs.length) {
    container.append(el('div', { class: 'mensagem-vazia', texto: 'Nenhum colaborador para exibir com os filtros atuais.' }));
    return;
  }

  const total = regs.length;
  const completos = regs.filter((r) => r['Documentos completos?'] === 'SIM').length;
  const comAlerta = regs.filter((r) => alertas(r).length > 0).length;
  const aprovados = regs.filter((r) => (r['Status atual'] || '').trim() === 'Aprovado').length;

  container.append(el('div', { class: 'kpis' }, [
    kpi(total, 'Colaboradores', ''),
    kpi(`${Math.round((completos / total) * 100)}%`, `Documentação completa (${completos} de ${total})`, 'verde'),
    kpi(comAlerta, 'Com alerta em aberto', comAlerta ? 'vermelho' : 'verde'),
    kpi(aprovados, 'Aprovados', 'verde'),
  ]));

  // --- Periodo dos dados exibidos -----------------------------------------
  // Data de entrada = a primeira entrada do historico de cada colaborador
  // (normalmente "Cadastro", gravada pela sincronizacao automatica). Quem
  // ja estava na planilha antes disso existir nao tem essa data.
  const datas = regs.map(dataEntradaDe).filter(Boolean);
  if (datas.length) {
    const min = new Date(Math.min(...datas));
    const max = new Date(Math.max(...datas));
    const rotuloPeriodo = min.getTime() === max.getTime()
      ? `Todos entraram em ${min.toLocaleDateString('pt-BR')}`
      : `Entradas de ${min.toLocaleDateString('pt-BR')} a ${max.toLocaleDateString('pt-BR')}`;
    container.append(el('div', { class: 'rotulo', style: 'margin:-10px 0 18px;' }, [
      `📅 ${rotuloPeriodo}`,
      datas.length < total ? ` — sem data para ${total - datas.length} colaborador(es) cadastrado(s) antes do histórico existir` : '',
    ]));
  }

  // --- Distribuicao por etapa -------------------------------------------
  const porEtapa = COLUNAS_KANBAN.map((c) => ({
    titulo: c.titulo,
    cor: c.cor,
    n: regs.filter((r) => c.status.includes((r['Status atual'] || '').trim())).length,
  }));

  container.append(el('div', { class: 'cartao-secao' }, [
    el('h3', { texto: 'Colaboradores por etapa' }),
    ...porEtapa.map((e) => barra(e.titulo, e.n, total, e.cor)),
  ]));

  // --- Situacao dos documentos ------------------------------------------
  const soma = { recebido: 0, pendente: 0, naoSeAplica: 0, total: 0 };
  for (const r of regs) {
    const c = contagemDocumentos(r);
    soma.recebido += c.recebido;
    soma.pendente += c.pendente;
    soma.naoSeAplica += c.naoSeAplica;
    soma.total += c.total;
  }

  container.append(el('div', { class: 'cartao-secao' }, [
    el('h3', { texto: 'Situação de todos os documentos exigidos' }),
    barra('Recebidos', soma.recebido, soma.total, COR.verde),
    barra('Pendentes', soma.pendente, soma.total, COR.vermelho),
    barra('Não se aplica', soma.naoSeAplica, soma.total, COR.cinza),
  ]));

  // --- Documentos que mais faltam ---------------------------------------
  // Serie unica de magnitude: uma cor so', ordenada do maior para o menor.
  const contagem = new Map();
  for (const r of regs) {
    for (const label of documentosFaltantes(r)) {
      contagem.set(label, (contagem.get(label) || 0) + 1);
    }
  }
  const ranking = [...contagem.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  container.append(el('div', { class: 'cartao-secao' }, [
    el('h3', { texto: 'Documentos que mais faltam' }),
    ...(ranking.length
      ? ranking.map(([label, n]) => barra(label, n, total, COR.vermelho))
      : [el('div', { class: 'alerta ok', texto: 'Nenhum documento obrigatório pendente.' })]),
  ]));

  // --- Alertas em aberto -------------------------------------------------
  const listaAlertas = [];
  for (const r of regs) {
    for (const a of alertas(r)) listaAlertas.push({ nome: r['Nome completo'], ...a });
  }
  listaAlertas.sort((a, b) => (a.nivel === 'critico' ? -1 : 1) - (b.nivel === 'critico' ? -1 : 1));

  container.append(el('div', { class: 'cartao-secao' }, [
    el('h3', { texto: `Alertas em aberto (${listaAlertas.length})` }),
    ...(listaAlertas.length
      ? listaAlertas.slice(0, 15).map((a) =>
          el('div', { class: `alerta ${a.nivel}`, texto: `${a.nome} — ${a.texto}` }))
      : [el('div', { class: 'alerta ok', texto: 'Nenhum alerta em aberto.' })]),
    listaAlertas.length > 15
      ? el('div', { class: 'rotulo', texto: `e mais ${listaAlertas.length - 15}…` })
      : null,
  ]));

  // --- Vinculo indefinido -------------------------------------------------
  const semVinculo = regs.filter((r) => !['CLT', 'PJ'].includes((r['Tipo'] || '').trim()));
  if (semVinculo.length) {
    container.append(el('div', { class: 'cartao-secao' }, [
      el('h3', { texto: 'Vínculo não definido' }),
      el('div', {
        class: 'alerta atencao',
        texto: `${plural(semVinculo.length, 'colaborador está', 'colaboradores estão')} sem CLT ou PJ `
          + 'definido. Sem o vínculo o app não consegue dizer quais documentos são exigidos.',
      }),
      ...semVinculo.map((r) => el('div', { class: 'barra-rotulo' }, [
        el('span', { texto: r['Nome completo'] }),
        el('span', { texto: r['Cargo / Função'] || '—' }),
      ])),
    ]));
  }
}
