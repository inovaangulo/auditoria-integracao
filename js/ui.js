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
 * Nome da pasta do colaborador (CPF/CNPJ_Nome_completo) a partir do registro
 * - mesma formatacao do gerador de pasta (js/telas/gerador-pasta.js) e da
 * sincronizacao automatica (nomePasta() no repo privado). Usado pro link
 * "abrir pasta" no Kanban/Lista. Devolve null se faltar CPF/CNPJ ou nome.
 */
export function nomeDaPastaColaborador(reg) {
  const digitos = String(reg['CPF'] || reg['CNPJ (se PJ)'] || '').replace(/\D/g, '');
  const nome = String(reg['Nome completo'] || '').trim();
  if (!digitos || !nome) return null;

  let doc = digitos;
  if (digitos.length === 11) doc = `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9, 11)}`;
  else if (digitos.length === 14) doc = `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8, 12)}-${digitos.slice(12, 14)}`;

  return `${doc.replace(/\//g, '-')}_${nome.replace(/\s+/g, '_')}`;
}

/**
 * Abre a pasta do colaborador no SharePoint numa aba nova - so' acha (nao
 * cria), pro link do Kanban/Lista. `fonte` e' estado.fonte (quem chama ja'
 * tem, pra' ui.js nao precisar depender de dados/index.js).
 */
export async function abrirPastaColaborador(reg, fonte) {
  if (!fonte?.acharPastaColaborador) return;
  const nomePasta = nomeDaPastaColaborador(reg);
  if (!nomePasta) {
    window.alert('Falta CPF/CNPJ ou nome completo pra achar a pasta.');
    return;
  }
  try {
    const pasta = await fonte.acharPastaColaborador(nomePasta);
    if (!pasta) {
      window.alert('Essa pasta ainda não existe no SharePoint.');
      return;
    }
    window.open(pasta.webUrl, '_blank', 'noopener');
  } catch (err) {
    window.alert(err.message || 'Não foi possível abrir a pasta.');
  }
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
