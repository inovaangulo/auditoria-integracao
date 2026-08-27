/**
 * Ficha do colaborador (gaveta lateral).
 *
 * Edita uma COPIA do registro e so' grava no "Salvar" — assim o Cancelar
 * realmente descarta, e um erro de digitacao no meio do preenchimento nao vai
 * parar na planilha compartilhada.
 */

import { documentosDoVinculo, VALORES_DOC, STATUS_VALIDOS, RESPONSAVEIS_ADM, CLIENTES_CONHECIDOS } from '../schema.js';
import { recalcular, alertas, paraInputDate } from '../regras.js';
import { salvarRegistro, excluirRegistro, historicoDe, dataEntradaDe, estado } from '../dados/index.js';
import { el, limpar, documentoDe, confirmarConflito } from '../ui.js';

const nos = {};
let original = null;   // registro como veio da fonte
let rascunho = null;   // copia em edicao
let aoErro = () => {};

export function configurar({ erro }) {
  aoErro = erro;

  nos.gaveta = document.getElementById('gaveta');
  nos.fundo = document.getElementById('fundoModal');
  nos.nome = document.getElementById('gavetaNome');
  nos.sub = document.getElementById('gavetaSub');
  nos.corpo = document.getElementById('gavetaCorpo');
  nos.btnSalvar = document.getElementById('btnSalvar');
  nos.btnExcluir = document.getElementById('btnExcluir');
  nos.aviso = document.getElementById('avisoSalvo');

  document.getElementById('btnFecharGaveta').addEventListener('click', fechar);
  document.getElementById('btnCancelar').addEventListener('click', fechar);
  nos.fundo.addEventListener('click', fechar);
  nos.btnSalvar.addEventListener('click', salvar);
  nos.btnExcluir.addEventListener('click', excluir);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !nos.gaveta.hidden) fechar();
  });
}

export function abrir(reg) {
  original = reg;
  rascunho = { ...reg };
  nos.aviso.textContent = estado.atualizacaoPendente
    ? 'Há uma atualização pendente — recarregue a página antes de editar.'
    : '';
  nos.btnSalvar.disabled = estado.atualizacaoPendente;
  nos.btnExcluir.disabled = estado.atualizacaoPendente;
  nos.gaveta.hidden = false;
  nos.fundo.hidden = false;
  desenhar();
  nos.corpo.scrollTop = 0;
}

/** Compara rascunho com o original - true se algum campo editável mudou e não foi salvo. */
function houveMudancaNaoSalva() {
  if (!original || !rascunho) return false;
  const chaves = new Set([...Object.keys(original), ...Object.keys(rascunho)]);
  for (const c of chaves) {
    if (c.startsWith('__')) continue; // campos internos (ex.: __linha), nao sao dado editado
    if (String(original[c] ?? '') !== String(rascunho[c] ?? '')) return true;
  }
  return false;
}

export function fechar({ forcar = false } = {}) {
  if (!forcar && houveMudancaNaoSalva()) {
    const sair = window.confirm('Você tem alterações não salvas nesta ficha. Sair sem salvar mesmo assim?');
    if (!sair) return; // mantem a gaveta aberta
  }
  nos.gaveta.hidden = true;
  nos.fundo.hidden = true;
  original = null;
  rascunho = null;
}

export function estaAberta() {
  return !nos.gaveta.hidden;
}

// Campos que mudam QUAL documento e' exigido (nao so' o valor de um documento
// ja' exibido) - precisam redesenhar a secao inteira, nao so' o resumo.
const CAMPOS_QUE_MUDAM_CHECKLIST = new Set(['Tipo', 'Cliente atual']);

/** Atualiza um campo do rascunho e redesenha o que depende dele. */
function definir(campo, valor) {
  rascunho[campo] = valor;
  rascunho = recalcular(rascunho);
  nos.aviso.textContent = '';
  if (CAMPOS_QUE_MUDAM_CHECKLIST.has(campo)) substituir('secaoDocumentos', secaoDocumentos());
  desenharDerivados();
}

/**
 * Remove da coluna "Alerta verificação de conteúdo" as entradas do TIPODOC
 * desse documento (ex.: "ASO" ou "ASO (não verificável)") - chamado quando o
 * ADM confirma manualmente que conferiu, dispensando o alerta sem precisar
 * editar aquele campo separadamente.
 */
function limparAlertaDeConteudoDoDoc(doc) {
  const atual = String(rascunho['Alerta verificação de conteúdo'] || '');
  if (!atual) return;
  const restantes = atual
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((item) => {
      const tipo = item.replace(/\s*\(não verificável\)\s*$/, '');
      return !(doc.abrevs || []).includes(tipo);
    });
  definir('Alerta verificação de conteúdo', restantes.join(', '));
}

// ---------------------------------------------------------------------------
// Montagem
// ---------------------------------------------------------------------------

function campoTexto(rotulo, campo, { tipo = 'text', largo = false } = {}) {
  const input = el('input', {
    type: tipo,
    value: tipo === 'date' ? paraInputDate(rascunho[campo]) : (rascunho[campo] ?? ''),
    'data-campo': campo,
  });
  input.addEventListener('input', () => input.classList.remove('erro'));
  input.addEventListener('change', () => definir(campo, input.value));
  return el('label', { class: `campo${largo ? ' largo' : ''}` }, [el('span', { texto: rotulo }), input]);
}

/** Marca um campo em vermelho e leva o foco até ele, para sinalizar o que precisa corrigir. */
function marcarErroNoCampo(campo) {
  const input = nos.corpo.querySelector(`[data-campo="${campo}"]`);
  if (!input) return;
  input.classList.add('erro');
  input.scrollIntoView({ block: 'center', behavior: 'smooth' });
  input.focus();
}

function campoSelect(rotulo, campo, opcoes, { largo = false } = {}) {
  const select = el('select', { 'data-campo': campo });
  for (const o of opcoes) {
    select.append(el('option', { value: o, texto: o || '—', selected: (rascunho[campo] || '') === o }));
  }
  select.addEventListener('change', () => { select.classList.remove('erro'); definir(campo, select.value); });
  return el('label', { class: `campo${largo ? ' largo' : ''}` }, [el('span', { texto: rotulo }), select]);
}

/**
 * Select do Responsável ADM: opções vêm de RESPONSAVEIS_ADM (schema.js), valor
 * gravado é o e-mail (é pra lá que o resumo diário de alertas é enviado).
 * Se o valor atual não bater com ninguém da lista (dado antigo, digitado à
 * mão antes desta mudança), mostra uma opção extra pra não sumir com o dado.
 */
function campoResponsavelAdm() {
  const atual = rascunho['Responsável ADM'] || '';
  const opcoes = RESPONSAVEIS_ADM.map((p) => ({ valor: p.email, rotulo: `${p.nome} — ${p.email}` }));
  if (atual && !opcoes.some((o) => o.valor === atual)) {
    opcoes.push({ valor: atual, rotulo: `${atual} (fora da lista)` });
  }

  const select = el('select', { 'data-campo': 'Responsável ADM' });
  select.append(el('option', { value: '', texto: 'Selecione…', selected: !atual }));
  for (const o of opcoes) {
    select.append(el('option', { value: o.valor, texto: o.rotulo, selected: atual === o.valor }));
  }
  select.addEventListener('change', () => { select.classList.remove('erro'); definir('Responsável ADM', select.value); });
  return el('label', { class: 'campo' }, [el('span', { texto: 'Responsável ADM' }), select]);
}

/**
 * Select do Cliente atual: opções vêm de CLIENTES_CONHECIDOS (schema.js), pra
 * evitar grafia diferente pro mesmo cliente (o que faria o checklist de
 * documentos por cliente não bater). Se o valor atual não bater com ninguém
 * da lista (dado antigo, digitado à mão antes desta mudança, ou cliente novo
 * ainda não cadastrado na lista), mostra uma opção extra pra não sumir com o dado.
 */
function campoClienteAtual() {
  const atual = rascunho['Cliente atual'] || '';
  const opcoes = [...CLIENTES_CONHECIDOS];
  if (atual && !opcoes.includes(atual)) opcoes.push(atual);

  const select = el('select', { 'data-campo': 'Cliente atual' });
  select.append(el('option', { value: '', texto: 'Selecione…', selected: !atual }));
  for (const c of opcoes) {
    const rotulo = !CLIENTES_CONHECIDOS.includes(c) ? `${c} (fora da lista)` : c;
    select.append(el('option', { value: c, texto: rotulo, selected: atual === c }));
  }
  select.addEventListener('change', () => { select.classList.remove('erro'); definir('Cliente atual', select.value); });
  return el('label', { class: 'campo' }, [el('span', { texto: 'Cliente atual' }), select]);
}

function campoCalculado(rotulo, texto, { largo = false } = {}) {
  return el('label', { class: `campo${largo ? ' largo' : ''}` }, [
    el('span', { texto: rotulo }),
    el('div', { class: 'calculado', texto: texto === '' || texto == null ? '—' : String(texto) }),
  ]);
}

function secaoAlertas() {
  const lista = alertas(rascunho);
  const entrada = dataEntradaDe(rascunho);
  const rotuloEntrada = el('div', { class: 'rotulo', texto:
    `Entrada: ${entrada ? entrada.toLocaleDateString('pt-BR') : '— sem registro no histórico'}` });
  const filhos = lista.length
    ? lista.map((a) => el('div', { class: `alerta ${a.nivel}`, texto: a.texto }))
    : [el('div', { class: 'alerta ok', texto: 'Nenhuma pendência de prazo ou inconsistência.' })];
  return el('div', { class: 'secao', id: 'secaoAlertas' }, [
    el('h3', { texto: 'Alertas' }), rotuloEntrada, ...filhos,
  ]);
}

function secaoDocumentos() {
  const docs = documentosDoVinculo(rascunho['Tipo'], rascunho['Cliente atual']);
  const obrigatorios = docs.filter((d) => !d.condicional);
  const recebidos = obrigatorios.filter((d) => {
    const v = (rascunho[d.campo] || '').trim();
    return v === 'Conferido automaticamente' || v === 'Conferido manualmente'
      || v === 'Pendente de conferência manual' || v === 'Não se aplica' || v === 'Recebido';
  }).length;

  const linhas = docs.map((d) => {
    const bruto = (rascunho[d.campo] || '').trim();
    // "Recebido" e' o valor antigo (antes de 19/08/2026) - mostra igual a
    // "Conferido automaticamente" ate' ser reprocessado/editado; o valor
    // gravado so' muda de fato se a pessoa tocar nesse campo.
    const valor = bruto === 'Recebido' ? 'Conferido automaticamente' : bruto;
    const select = el('select', { 'data-v': valor });
    select.append(el('option', { value: '', texto: 'Não recebido', selected: valor === '' }));
    for (const v of VALORES_DOC) {
      select.append(el('option', { value: v, texto: v, selected: valor === v }));
    }
    select.addEventListener('change', () => {
      select.setAttribute('data-v', select.value);
      definir(d.campo, select.value);
      // Escolher "Conferido manualmente" e' a acao que resolve o alerta de
      // verificacao de conteudo desse documento - nao precisa mais apagar
      // o texto do alerta na mao em outro lugar.
      if (select.value === 'Conferido manualmente') limparAlertaDeConteudoDoDoc(d);
    });

    return el('div', { class: 'doc-linha' }, [
      el('span', { class: 'doc-nome' }, [
        d.label,
        d.condicional ? el('span', { class: 'marca-cond', texto: ' (não bloqueia)' }) : null,
      ]),
      select,
    ]);
  });

  const tipo = rascunho['Tipo'] || 'sem vínculo definido';
  return el('div', { class: 'secao', id: 'secaoDocumentos' }, [
    el('h3', { texto: `Documentos exigidos — ${tipo}` }),
    el('div', { class: 'progresso-docs' }, [
      el('span', { texto: `${recebidos} de ${obrigatorios.length} obrigatórios resolvidos` }),
      el('span', { texto: rascunho['Documentos completos?'] === 'SIM' ? 'Completo' : 'Incompleto' }),
    ]),
    ...linhas,
  ]);
}

function secaoCalculados() {
  return el('div', { class: 'secao', id: 'secaoCalculados' }, [
    el('h3', { texto: 'Prazos (calculado automaticamente)' }),
    el('div', { class: 'grade' }, [
      campoCalculado('Documentos completos?', rascunho['Documentos completos?'] || 'Não'),
      campoCalculado('Dias aguardando assinatura', rascunho['Dias aguardando assinatura']),
      campoCalculado('Dias sem confirmação (PJ)', rascunho['Dias sem confirmação (PJ)']),
      campoCalculado('Dias úteis na análise Wehandle', rascunho['Dias sem confirmação']),
      campoCalculado('Situação do prazo Wehandle', rascunho['Situação prazo Wehandle']),
      campoCalculado('Consistência do status', rascunho['Consistência do status']),
    ]),
  ]);
}

/** Placeholder enquanto o historico (na planilha) ainda esta' carregando. */
function secaoHistoricoCarregando() {
  return el('div', { class: 'secao', id: 'secaoHistorico' }, [
    el('h3', { texto: 'Histórico de alterações' }),
    el('div', { class: 'rotulo', texto: 'Carregando…' }),
  ]);
}

function secaoHistoricoPronta(entradas) {
  const itens = entradas.length
    ? entradas.slice(0, 12).map((e) => el('li', {}, [
        el('span', {}, [
          ...e.mudancas.slice(0, 4).flatMap((m, i) => [
            i ? '; ' : '',
            el('b', { texto: rotuloCurto(m.campo) }),
            `: ${m.de || '—'} → ${m.para || '—'}`,
          ]),
          e.mudancas.length > 4 ? ` (+${e.mudancas.length - 4})` : '',
        ]),
        el('span', {
          class: 'quando',
          texto: `${new Date(e.quando).toLocaleString('pt-BR')} · ${e.quem}`,
        }),
      ]))
    : [el('li', { texto: 'Nenhuma alteração registrada ainda.' })];

  return el('div', { class: 'secao', id: 'secaoHistorico' }, [
    el('h3', { texto: 'Histórico de alterações' }),
    el('ul', { class: 'historico' }, itens),
  ]);
}

/** Busca o historico (pode vir da planilha, entao e' assincrono) e substitui
 * o placeholder quando chegar. Descarta o resultado se a gaveta ja' mudou de
 * colaborador nesse meio-tempo. */
async function carregarHistorico() {
  const alvo = rascunho;
  const entradas = await historicoDe(alvo).catch(() => []);
  if (rascunho !== alvo) return;
  substituir('secaoHistorico', secaoHistoricoPronta(entradas));
}

function rotuloCurto(campo) {
  return campo.replace(/^Doc: /, '').replace(/ \(.*\)$/, '');
}

function desenhar() {
  nos.nome.textContent = rascunho['Nome completo'] || 'Sem nome';
  nos.sub.textContent = [
    documentoDe(rascunho),
    rascunho['Tipo'],
    rascunho['Cliente atual'],
  ].filter(Boolean).join(' · ');

  limpar(nos.corpo);
  nos.corpo.append(
    secaoAlertas(),

    el('div', { class: 'secao' }, [
      el('h3', { texto: 'Dados do colaborador' }),
      el('div', { class: 'grade' }, [
        campoTexto('Nome completo', 'Nome completo', { largo: true }),
        campoTexto('CPF', 'CPF'),
        campoTexto('CNPJ (se PJ)', 'CNPJ (se PJ)'),
        campoSelect('Vínculo', 'Tipo', ['', 'CLT', 'PJ']),
        campoClienteAtual(),
        campoTexto('Cargo / Função', 'Cargo / Função'),
        campoResponsavelAdm(),
        campoTexto('WhatsApp contato', 'WhatsApp contato'),
      ]),
    ]),

    el('div', { class: 'secao' }, [
      el('h3', { texto: 'Situação e prazos' }),
      el('div', { class: 'grade' }, [
        campoSelect('Status atual', 'Status atual', ['', ...STATUS_VALIDOS], { largo: true }),
        campoTexto('Data envio para assinatura', 'Data envio p/ assinatura', { tipo: 'date' }),
        campoTexto('Data envio para análise Wehandle', 'Data envio p/ análise Wehandle', { tipo: 'date' }),
        campoTexto('Data cadastro empresa Wehandle (PJ)', 'Data cadastro empresa Wehandle (PJ)', { tipo: 'date' }),
        campoTexto('Data aprovação', 'Data aprovação', { tipo: 'date' }),
        campoTexto('Data integração agendada', 'Data integração agendada', { tipo: 'date' }),
        campoTexto('Resultado análise', 'Resultado análise'),
        campoTexto('Motivo reprovação', 'Motivo reprovação', { largo: true }),
        campoTexto(
          'Alerta de verificação de conteúdo (apague depois de conferir o documento)',
          'Alerta verificação de conteúdo',
          { largo: true }
        ),
      ]),
    ]),

    secaoDocumentos(),
    secaoCalculados(),

    el('div', { class: 'secao' }, [
      el('h3', { texto: 'Observações' }),
      el('div', { class: 'grade' }, [
        campoTexto('Clientes / projetos em que já atuou', 'Clientes / projetos em que já atuou', { largo: true }),
        (() => {
          const ta = el('textarea', { texto: rascunho['Observações'] ?? '' });
          ta.addEventListener('change', () => definir('Observações', ta.value));
          return el('label', { class: 'campo largo' }, [el('span', { texto: 'Observações' }), ta]);
        })(),
      ]),
    ]),

    secaoHistoricoCarregando(),
  );
  carregarHistorico();
}

/** Redesenha so' o que muda a cada edicao, para nao perder o foco do campo. */
function desenharDerivados() {
  substituir('secaoAlertas', secaoAlertas());
  substituir('secaoCalculados', secaoCalculados());

  const docs = document.getElementById('secaoDocumentos');
  if (docs) {
    const progresso = secaoDocumentos().querySelector('.progresso-docs');
    docs.querySelector('.progresso-docs').replaceWith(progresso);
  }
}

function substituir(id, novo) {
  const antigo = document.getElementById(id);
  if (antigo) antigo.replaceWith(novo);
}

// ---------------------------------------------------------------------------
// Gravacao
// ---------------------------------------------------------------------------

/** Bloqueia o salvamento: mostra um alerta (pop-up) e destaca o campo com o problema em vermelho. */
function bloquearSalvamento(campo, mensagem) {
  aoErro(mensagem);
  marcarErroNoCampo(campo);
  window.alert(mensagem);
}

/** Se a gravacao recusar por edicao simultanea, pergunta se sobrescreve. */
async function salvarComConfirmacaoDeConflito(rascunhoAtual, originalAtual) {
  try {
    return await salvarRegistro(rascunhoAtual, originalAtual);
  } catch (err) {
    if (!confirmarConflito(err)) throw err;
    return salvarRegistro(rascunhoAtual, originalAtual, { forcar: true });
  }
}

async function salvar() {
  if (!rascunho) return;
  if (!String(rascunho['Nome completo'] || '').trim()) {
    bloquearSalvamento('Nome completo', 'Informe o nome do colaborador antes de salvar.');
    return;
  }
  const responsavel = String(rascunho['Responsável ADM'] || '').trim();
  if (!responsavel) {
    bloquearSalvamento('Responsável ADM', 'Selecione o Responsável ADM antes de salvar — é para lá que os avisos de alerta são enviados.');
    return;
  }

  nos.btnSalvar.disabled = true;
  nos.aviso.textContent = 'Salvando…';
  try {
    const salvo = await salvarComConfirmacaoDeConflito(rascunho, original);
    original = salvo;
    rascunho = { ...salvo };
    nos.aviso.textContent = 'Salvo';
    desenhar();
  } catch (err) {
    nos.aviso.textContent = '';
    aoErro(err.message);
  } finally {
    nos.btnSalvar.disabled = false;
  }
}

async function excluir() {
  if (!original) return;
  const nome = original['Nome completo'] || 'este colaborador';
  const confirmado = window.confirm(
    `Excluir ${nome} da planilha? A linha é removida de verdade (não só o status) e não tem desfazer no app ` +
    `- só pelo histórico de versões do arquivo no SharePoint.`
  );
  if (!confirmado) return;

  nos.btnExcluir.disabled = true;
  nos.btnSalvar.disabled = true;
  nos.aviso.textContent = 'Excluindo…';
  try {
    await excluirRegistro(original);
    fechar({ forcar: true }); // ja' foi excluido - nao faz sentido perguntar sobre "sair sem salvar"
  } catch (err) {
    nos.aviso.textContent = '';
    aoErro(err.message);
    nos.btnExcluir.disabled = false;
    nos.btnSalvar.disabled = false;
  }
}
