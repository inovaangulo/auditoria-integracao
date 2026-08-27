/**
 * Gerador/criador de pasta que a ADM usa para dar entrada num colaborador
 * novo (padrão CPF/CNPJ_Nome completo).
 *
 * O nome em si espelha exatamente a lógica que a sincronização automática
 * usa para separar de volta (nomePasta/novoRegistroDaPasta em
 * AuditoriaIntegracaoAutomacao/scripts/sincronizar-documentos.mjs) - só a
 * barra do CNPJ vira "-" (SharePoint proíbe barra em nome de pasta), o resto
 * da pontuação fica.
 *
 * Desde 19/08/2026 (pedido da Sara) o modal também cria a pasta de verdade
 * no SharePoint e sobe os documentos escolhidos - não é só texto pra copiar
 * mais. So' aparece se a fonte de dados suportar isso (estado.fonte.
 * criarOuAcharPastaColaborador) - no modo local (sem SharePoint) o modal
 * volta a ser so' o gerador de texto, como antes.
 */

import { estado } from '../dados/index.js';
import { OPCOES_TIPODOC } from '../schema.js';
import { el, limpar, forcarMaiusculo } from '../ui.js';

const nos = {};
let arquivos = []; // { id, arquivo: File, tipo: '', tipoCustom: '', status: '' }
let proximoId = 1;
let criando = false;
let modo = 'novo'; // 'novo' (digita nome/CPF) ou 'existente' (busca na lista ja' carregada)

const OUTRO = '__outro__';

function normalizarBusca(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/** Normaliza o tipo digitado a mao pro mesmo padrao das siglas conhecidas (maiuscula, sem acento/espaco). */
function normalizarTipoCustom(s) {
  return String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '');
}

/** Tipo que de fato vai pro nome do arquivo - a sigla escolhida, ou o texto digitado em "Outro". */
function tipoEfetivo(item) {
  return item.tipo === OUTRO ? normalizarTipoCustom(item.tipoCustom) : item.tipo;
}

export function configurar() {
  nos.modal = document.getElementById('modalPasta');
  nos.fundo = document.getElementById('fundoModalPasta');
  nos.vinculoSecao = document.getElementById('pastaVinculoSecao');
  nos.vinculo = document.getElementById('pastaVinculo');
  nos.nomeSecao = document.getElementById('pastaNomeSecao');
  nos.nome = document.getElementById('pastaNome');
  nos.doc = document.getElementById('pastaDoc');
  nos.docRotulo = document.getElementById('pastaDocRotulo');
  nos.aviso = document.getElementById('pastaAviso');
  nos.saida = document.getElementById('pastaSaida');
  nos.btnCopiar = document.getElementById('btnCopiarPasta');
  nos.uploadSecao = document.getElementById('pastaUploadSecao');
  nos.arquivosInput = document.getElementById('pastaArquivosInput');
  nos.listaArquivos = document.getElementById('pastaListaArquivos');
  nos.btnCriar = document.getElementById('btnCriarPasta');
  nos.resultado = document.getElementById('pastaResultado');
  nos.modoContainer = document.getElementById('pastaModo');
  nos.modoNovo = document.getElementById('pastaModoNovo');
  nos.modoExistente = document.getElementById('pastaModoExistente');
  nos.buscaSecao = document.getElementById('pastaBuscaSecao');
  nos.buscaInput = document.getElementById('pastaBuscaInput');
  nos.buscaResultados = document.getElementById('pastaBuscaResultados');

  document.getElementById('btnFecharModalPasta').addEventListener('click', fechar);
  nos.fundo.addEventListener('click', fechar);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !nos.modal.hidden) fechar();
  });

  nos.vinculo.addEventListener('change', atualizar);
  nos.nome.addEventListener('input', () => { forcarMaiusculo(nos.nome); atualizar(); });
  nos.doc.addEventListener('input', atualizar);
  nos.btnCopiar.addEventListener('click', copiar);

  nos.modoNovo.addEventListener('click', () => definirModo('novo'));
  nos.modoExistente.addEventListener('click', () => definirModo('existente'));
  nos.buscaInput.addEventListener('input', () => renderizarBuscaResultados());

  nos.arquivosInput.addEventListener('change', () => {
    for (const arquivo of nos.arquivosInput.files) {
      arquivos.push({ id: proximoId++, arquivo, tipo: '', tipoCustom: '', status: '' });
    }
    nos.arquivosInput.value = ''; // permite escolher o mesmo arquivo de novo se remover e reconsiderar
    desenharListaArquivos();
    atualizarBotaoCriar();
  });
  nos.btnCriar.addEventListener('click', criarPasta);
}

export function abrir() {
  nos.vinculo.value = '';
  nos.nome.value = '';
  nos.doc.value = '';
  arquivos = [];
  criando = false;
  limpar(nos.resultado);
  const usaSharePoint = Boolean(estado.fonte?.criarOuAcharPastaColaborador);
  nos.uploadSecao.hidden = !usaSharePoint;
  // Com o upload no proprio app, copiar o nome pra colar em outro lugar
  // deixa de fazer sentido - so' continua no modo local (sem SharePoint).
  nos.btnCopiar.hidden = usaSharePoint;
  // "Colaborador existente" so' faz sentido com dados carregados de verdade.
  nos.modoContainer.hidden = !usaSharePoint;
  desenharListaArquivos();
  definirModo('novo');
  nos.modal.hidden = false;
  nos.fundo.hidden = false;
  atualizar();
  nos.nome.focus();
}

/** Alterna entre digitar os dados de um colaborador novo ou buscar um ja' existente. */
function definirModo(novoModo) {
  modo = novoModo;
  nos.modoNovo.classList.toggle('ativo', modo === 'novo');
  nos.modoExistente.classList.toggle('ativo', modo === 'existente');
  nos.buscaSecao.hidden = modo !== 'existente';
  // Vínculo já é um dado fixo do colaborador existente - não faz sentido
  // pedir de novo, só quando ainda não existe cadastro nenhum.
  nos.vinculoSecao.hidden = modo === 'existente';
  // O nome ja' aparece no resultado da busca ao selecionar - repetir o campo
  // e' redundante nesse modo (o campo continua existindo por baixo, so' nao
  // aparece pra pessoa).
  nos.nomeSecao.hidden = modo === 'existente';
  nos.btnCriar.textContent = textoBotaoCriar();
  nos.buscaInput.value = '';
  limpar(nos.buscaResultados);
  nos.vinculo.value = '';
  nos.nome.value = '';
  nos.doc.value = '';
  nos.nome.readOnly = modo === 'existente';
  nos.doc.readOnly = modo === 'existente';
  atualizar();
  if (modo === 'existente') nos.buscaInput.focus();
  else nos.nome.focus();
}

/** Lista os colaboradores ja' cadastrados que batem com a busca (nome, CPF ou CNPJ). */
function renderizarBuscaResultados() {
  limpar(nos.buscaResultados);
  const termo = normalizarBusca(nos.buscaInput.value.trim());
  if (!termo) return;

  const encontrados = (estado.registros || [])
    .filter((r) => {
      const alvo = normalizarBusca(`${r['Nome completo'] || ''} ${r['CPF'] || ''} ${r['CNPJ (se PJ)'] || ''}`);
      return alvo.includes(termo);
    })
    .slice(0, 8);

  if (!encontrados.length) {
    nos.buscaResultados.append(el('p', { class: 'pasta-busca-item', texto: 'Nenhum colaborador encontrado.' }));
    return;
  }

  for (const reg of encontrados) {
    const doc = reg['CPF'] || reg['CNPJ (se PJ)'] || '';
    nos.buscaResultados.append(el('button', {
      type: 'button', class: 'pasta-busca-item',
      onclick: () => {
        nos.nome.value = (reg['Nome completo'] || '').toUpperCase();
        nos.doc.value = doc;
        nos.buscaInput.value = reg['Nome completo'] || '';
        limpar(nos.buscaResultados);
        atualizar();
      },
    }, [
      reg['Nome completo'] || '(sem nome)',
      el('span', { class: 'sub', texto: ` — ${doc || 'sem CPF/CNPJ'}` }),
    ]));
  }
}

function fechar() {
  nos.modal.hidden = true;
  nos.fundo.hidden = true;
}

function apenasDigitos(s) {
  return String(s || '').replace(/\D/g, '');
}

/** Mascara CPF (11 dígitos) ou CNPJ (14) - so' quando a quantidade bate certinho. */
function formatarDocumento(digitos) {
  if (digitos.length === 11) {
    return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9, 11)}`;
  }
  if (digitos.length === 14) {
    return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8, 12)}-${digitos.slice(12, 14)}`;
  }
  return digitos;
}

function definirAviso(texto, tom) {
  nos.aviso.textContent = texto;
  nos.aviso.className = `alerta ${tom}`;
}

function atualizar() {
  const nome = nos.nome.value.trim();
  const digitos = apenasDigitos(nos.doc.value);

  // Modo "existente": o campo ja' vem preenchido, so-leitura, de um registro
  // real - so' confere se o formato bate com CPF ou CNPJ, sem pedir vinculo
  // de novo (a secao fica escondida - ver definirModo).
  if (modo === 'existente') {
    nos.docRotulo.textContent = 'CPF ou CNPJ';
    const completo = digitos.length === 11 || digitos.length === 14;
    if (!nome || !completo) definirAviso('Busque e selecione um colaborador da lista.', 'atencao');
    else definirAviso(digitos.length === 11 ? 'CPF — colaborador CLT.' : 'CNPJ — colaborador PJ.', 'ok');
    montarSaida(nome, digitos, Boolean(nome) && completo);
    return;
  }

  const vinculo = nos.vinculo.value;
  const esperado = vinculo === 'CLT' ? 11 : vinculo === 'PJ' ? 14 : null;
  nos.docRotulo.textContent = vinculo === 'CLT' ? 'CPF' : vinculo === 'PJ' ? 'CNPJ' : 'CPF ou CNPJ';

  let pronto = false;
  if (!vinculo) {
    definirAviso('Selecione se é CLT ou PJ.', 'atencao');
  } else if (!nome && !digitos) {
    definirAviso(`Preencha o nome completo e o ${vinculo === 'CLT' ? 'CPF' : 'CNPJ'}.`, 'atencao');
  } else if (!nome) {
    definirAviso('Falta o nome completo.', 'atencao');
  } else if (digitos.length !== esperado) {
    definirAviso(
      `${vinculo} usa ${vinculo === 'CLT' ? 'CPF (11 dígitos)' : 'CNPJ (14 dígitos)'} — `
      + `agora tem ${digitos.length} dígito(s). Confira antes de criar a pasta.`,
      'atencao'
    );
  } else {
    definirAviso(`${vinculo === 'CLT' ? 'CPF' : 'CNPJ'} confere com ${vinculo}.`, 'ok');
    pronto = true;
  }

  montarSaida(nome, digitos, pronto);
}

function montarSaida(nome, digitos, pronto) {
  if (pronto) {
    // Mesma regra da sincronização: so' a barra do CNPJ vira "-", espaços do
    // nome viram "_" - ver nomePasta() em sincronizar-documentos.mjs.
    const docParaPasta = formatarDocumento(digitos).replace(/\//g, '-');
    const nomeParaPasta = nome.replace(/\s+/g, '_');
    nos.saida.value = `${docParaPasta}_${nomeParaPasta}`;
  } else {
    nos.saida.value = '';
  }
  nos.btnCopiar.disabled = !pronto;
  atualizarBotaoCriar();
}

async function copiar() {
  if (!nos.saida.value) return;
  const original = nos.btnCopiar.textContent;
  try {
    await navigator.clipboard.writeText(nos.saida.value);
    nos.btnCopiar.textContent = 'Copiado!';
  } catch {
    // Navegador pode negar por permissao/foco - selecionar o texto deixa o
    // Ctrl+C manual como alternativa, em vez de falhar sem avisar nada.
    nos.saida.select();
    nos.btnCopiar.textContent = 'Selecionado - use Ctrl+C';
  }
  nos.btnCopiar.disabled = true;
  setTimeout(() => {
    nos.btnCopiar.textContent = original;
    nos.btnCopiar.disabled = !nos.saida.value;
  }, 2000);
}

// ---------------------------------------------------------------------------
// Upload de documentos (so' quando a fonte suporta - modo SharePoint)
// ---------------------------------------------------------------------------

function desenharListaArquivos() {
  limpar(nos.listaArquivos);
  for (const item of arquivos) {
    const select = el('select', { disabled: criando }, [
      el('option', { value: '', texto: 'Escolha o tipo…', selected: item.tipo === '' }),
      ...OPCOES_TIPODOC.map((o) => el('option', { value: o.valor, texto: o.rotulo, selected: item.tipo === o.valor })),
      el('option', { value: OUTRO, texto: 'Outro (digitar)', selected: item.tipo === OUTRO }),
    ]);
    select.addEventListener('change', () => {
      item.tipo = select.value;
      desenharListaArquivos(); // precisa redesenhar pra mostrar/escoder o campo de texto do "Outro"
      atualizarBotaoCriar();
    });

    const campoCustom = item.tipo === OUTRO
      ? el('input', {
          type: 'text', placeholder: 'Nome do tipo (ex.: CARTA REFERENCIA)', value: item.tipoCustom || '',
          disabled: criando,
          oninput: (e) => { item.tipoCustom = e.target.value; atualizarBotaoCriar(); },
        })
      : null;

    const btnRemover = el('button', {
      class: 'btn-secundario', type: 'button', texto: 'Remover', disabled: criando,
      onclick: () => {
        arquivos = arquivos.filter((a) => a.id !== item.id);
        desenharListaArquivos();
        atualizarBotaoCriar();
      },
    });

    nos.listaArquivos.append(el('div', { class: 'pasta-arquivo-linha' }, [
      el('span', { class: 'pasta-arquivo-nome', texto: item.arquivo.name }),
      select,
      campoCustom,
      btnRemover,
      item.status ? el('span', { class: 'pasta-arquivo-status', texto: item.status }) : null,
    ]));
  }
}

/** Rótulo do botão de ação - em "existente" a pasta já existe, então é só envio de arquivo. */
function textoBotaoCriar() {
  return modo === 'existente' ? 'Upload de arquivos' : 'Criar pasta no SharePoint';
}

function atualizarBotaoCriar() {
  if (!nos.btnCriar) return;
  const prontoDados = Boolean(nos.saida.value);
  const arquivosOk = arquivos.length > 0 && arquivos.every((a) => tipoEfetivo(a));
  nos.btnCriar.disabled = criando || !prontoDados || !arquivosOk;
}

async function criarPasta() {
  if (criando || !estado.fonte?.criarOuAcharPastaColaborador) return;
  criando = true;
  nos.btnCriar.disabled = true;
  nos.btnCriar.textContent = modo === 'existente' ? 'Enviando…' : 'Criando pasta…';
  limpar(nos.resultado);
  desenharListaArquivos();

  try {
    const nomePasta = nos.saida.value;
    const { id: pastaId, webUrl, criada } = await estado.fonte.criarOuAcharPastaColaborador(nomePasta);
    nos.resultado.append(el('p', { class: 'alerta ok' }, [
      criada ? 'Pasta criada. ' : 'A pasta já existia — reaproveitada, sem duplicar. ',
      el('a', { href: webUrl, target: '_blank', rel: 'noopener', texto: 'Abrir no SharePoint' }),
    ]));

    let sucesso = 0;
    for (const item of arquivos) {
      item.status = 'Enviando…';
      desenharListaArquivos();
      try {
        const extensao = item.arquivo.name.includes('.') ? `.${item.arquivo.name.split('.').pop()}` : '';
        const nomeArquivo = `${tipoEfetivo(item)}${extensao}`;
        await estado.fonte.enviarArquivoParaPasta(pastaId, nomeArquivo, item.arquivo);
        item.status = 'Enviado ✓';
        sucesso++;
      } catch (err) {
        item.status = `Erro: ${err.message}`;
      }
      desenharListaArquivos();
    }

    if (arquivos.length) {
      nos.resultado.append(el('p', {
        class: `alerta ${sucesso === arquivos.length ? 'ok' : 'atencao'}`,
        texto: `${sucesso} de ${arquivos.length} documento(s) enviados.`,
      }));
    }
  } catch (err) {
    nos.resultado.append(el('p', { class: 'alerta atencao', texto: err.message }));
  } finally {
    criando = false;
    nos.btnCriar.textContent = textoBotaoCriar();
    desenharListaArquivos();
    atualizarBotaoCriar();
  }
}
