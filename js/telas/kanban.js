/** Quadro Kanban: uma coluna por etapa, um cartao por colaborador. */

import { COLUNAS_KANBAN } from '../schema.js';
import { porColuna, alertas, documentosFaltantes, mudarStatus, chave } from '../dados/index.js';
import { el, limpar, documentoDe, plural, confirmarConflito } from '../ui.js';

let aoAbrirDetalhe = () => {};
let aoErro = () => {};

export function configurar({ abrirDetalhe, erro }) {
  aoAbrirDetalhe = abrirDetalhe;
  aoErro = erro;
}

/** Cartao arrastado no momento — o drop precisa saber de quem se trata. */
let arrastando = null;

function montarCartao(reg) {
  const faltando = documentosFaltantes(reg);
  const listaAlertas = alertas(reg);

  const badges = el('div', { class: 'cartao-badges' }, [
    el('span', { class: 'badge tipo', texto: reg['Tipo'] || 'Sem vínculo' }),
    faltando.length
      ? el('span', {
          class: 'badge faltando',
          texto: plural(faltando.length, 'documento faltando', 'documentos faltando'),
          title: faltando.join('\n'),
        })
      : el('span', { class: 'badge completo', texto: 'Documentação completa' }),
    listaAlertas.length
      ? el('span', {
          class: 'badge alerta',
          texto: plural(listaAlertas.length, 'alerta', 'alertas'),
          title: listaAlertas.map((a) => a.texto).join('\n'),
        })
      : null,
  ]);

  const cartao = el('article', {
    class: `cartao${listaAlertas.length ? ' tem-alerta' : ''}`,
    draggable: 'true',
    tabindex: '0',
    role: 'button',
    'aria-label': `Abrir ficha de ${reg['Nome completo']}`,
  }, [
    el('div', { class: 'cartao-nome', texto: reg['Nome completo'] }),
    el('div', { class: 'cartao-linha', texto: documentoDe(reg) }),
    el('div', { class: 'cartao-linha', texto: reg['Cargo / Função'] || 'Cargo não informado' }),
    badges,
  ]);

  cartao.addEventListener('click', () => aoAbrirDetalhe(reg));
  cartao.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); aoAbrirDetalhe(reg); }
  });

  cartao.addEventListener('dragstart', (e) => {
    arrastando = reg;
    cartao.classList.add('arrastando');
    e.dataTransfer.effectAllowed = 'move';
    // Alguns navegadores so' iniciam o arrasto se houver payload definido.
    e.dataTransfer.setData('text/plain', chave(reg));
  });
  cartao.addEventListener('dragend', () => {
    arrastando = null;
    cartao.classList.remove('arrastando');
  });

  return cartao;
}

function montarColuna(def, registros) {
  const corpo = el('div', { class: 'coluna-corpo', id: `corpo_${def.id}` });

  if (registros.length) registros.forEach((r) => corpo.append(montarCartao(r)));
  else corpo.append(el('div', { class: 'vazio', texto: 'Nenhum colaborador' }));

  const coluna = el('section', { class: 'coluna' }, [
    el('div', { class: 'coluna-titulo', style: `color:${def.cor}` }, [
      el('span', { texto: def.titulo }),
      el('span', { class: 'coluna-contagem' }, [el('span', { texto: String(registros.length) })]),
    ]),
    corpo,
  ]);

  coluna.addEventListener('dragover', (e) => {
    if (!arrastando) return;
    e.preventDefault();               // sem isso o navegador recusa o drop
    e.dataTransfer.dropEffect = 'move';
    coluna.classList.add('arrastando-sobre');
  });
  coluna.addEventListener('dragleave', (e) => {
    // Ignora a saida para elementos filhos, senao o realce pisca.
    if (!coluna.contains(e.relatedTarget)) coluna.classList.remove('arrastando-sobre');
  });
  coluna.addEventListener('drop', async (e) => {
    e.preventDefault();
    coluna.classList.remove('arrastando-sobre');
    const reg = arrastando;
    arrastando = null;
    if (!reg) return;
    try {
      await mudarStatus(reg, def.statusPadrao);
    } catch (err) {
      if (confirmarConflito(err)) {
        try {
          await mudarStatus(reg, def.statusPadrao, { forcar: true });
          return;
        } catch (err2) {
          aoErro(err2.message);
          return;
        }
      }
      aoErro(err.message);
    }
  });

  return coluna;
}

export function renderizar(container) {
  const mapa = porColuna();
  limpar(container);
  for (const def of COLUNAS_KANBAN) {
    container.append(montarColuna(def, mapa[def.id] || []));
  }
}
