/** Utilitarios de interface compartilhados pelas telas. */

/** Escapa texto vindo da planilha antes de entrar em innerHTML. */
export function esc(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function el(tag, atributos = {}, filhos = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(atributos)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'texto') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const f of [].concat(filhos)) {
    if (f == null) continue;
    node.append(f instanceof Node ? f : document.createTextNode(f));
  }
  return node;
}

export function limpar(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

/** Documento identificador para exibicao: CPF do CLT, CNPJ do PJ. */
export function documentoDe(reg) {
  const cpf = String(reg['CPF'] || '').trim();
  const cnpj = String(reg['CNPJ (se PJ)'] || '').trim();
  if (reg['Tipo'] === 'PJ') return cnpj || cpf || '—';
  return cpf || cnpj || '—';
}

export function plural(n, singular, pluralPalavra) {
  return `${n} ${n === 1 ? singular : pluralPalavra}`;
}

/**
 * Forca o valor de um input pra maiuscula, preservando a posicao do cursor
 * (maiusculizar nao muda o tamanho do texto, entao só reaplica a selecao).
 * Usado nos campos de nome (padronização pedida pela Sara, 26/08/2026).
 */
export function forcarMaiusculo(input) {
  const inicio = input.selectionStart;
  const fim = input.selectionEnd;
  input.value = input.value.toUpperCase();
  if (inicio !== null && fim !== null) input.setSelectionRange(inicio, fim);
}

/** Pergunta se sobrescreve quando `salvarRegistro`/`mudarStatus` recusa por edicao simultanea (err.conflito). */
export function confirmarConflito(err) {
  return Boolean(err?.conflito) && window.confirm(`${err.message}\n\nClique OK para sobrescrever, ou Cancelar pra revisar antes.`);
}
