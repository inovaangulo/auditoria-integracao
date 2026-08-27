/**
 * Aba de referencia: quais documentos cada cliente exige, sem depender de
 * nenhum colaborador cadastrado - so' le DOCUMENTOS/CLIENTES_CONHECIDOS
 * (schema.js) e mostra em forma de lista. Pedido da Sara, 27/08/2026.
 */

import { DOCUMENTOS, CLIENTES_CONHECIDOS, normalizarCliente } from '../schema.js';
import { el, limpar } from '../ui.js';

function rotuloVinculo(d) {
  return d.vinculo === 'todos' ? 'CLT/PJ' : d.vinculo;
}

function itemDoc(d, extra) {
  return el('li', {}, [
    d.label,
    el('span', { class: 'rotulo', texto: ` (${rotuloVinculo(d)}${d.condicional ? ', não bloqueia' : ''})` }),
    extra ? el('span', { class: 'rotulo', texto: ` — ${extra}` }) : null,
  ]);
}

export function renderizar(container) {
  limpar(container);

  const base = DOCUMENTOS.filter((d) => !d.clientes && !d.exceto);

  container.append(
    el('p', { class: 'rotulo', style: 'margin:-4px 0 18px;max-width:640px;' }, [
      'Checklist completo por cliente — a base vale pra qualquer colaborador; cada cliente '
      + 'abaixo mostra só o que muda em relação à base (documento extra ou dispensado). '
      + 'Fonte: DOCUMENTOS DE INTEGRAÇÃO.docx (ADM).',
    ]),

    el('div', { class: 'cartao-secao' }, [
      el('h3', { texto: 'Base — vale pra qualquer cliente' }),
      el('ul', { class: 'lista-checklist' }, base.map((d) => itemDoc(d))),
    ]),

    el('div', { class: 'grade-checklist-clientes' }, CLIENTES_CONHECIDOS.map((cliente) => {
      const alvo = normalizarCliente(cliente);
      const extras = DOCUMENTOS.filter((d) => d.clientes?.some((c) => normalizarCliente(c) === alvo));
      const dispensados = DOCUMENTOS.filter((d) => d.exceto?.some((c) => normalizarCliente(c) === alvo));

      const linhas = [
        ...extras.map((d) => itemDoc(d, 'extra')),
        ...dispensados.map((d) => itemDoc(d, 'dispensado')),
      ];

      return el('div', { class: 'cartao-secao cartao-cliente' }, [
        el('h3', { texto: cliente }),
        linhas.length
          ? el('ul', { class: 'lista-checklist' }, linhas)
          : el('p', { class: 'rotulo', texto: 'Sem exigência extra — só a base.' }),
      ]);
    }))
  );
}
