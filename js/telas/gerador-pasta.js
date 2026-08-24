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
import { el, limpar } from '../ui.js';

const nos = {};
let arquivos = []; // { id, arquivo: File, tipo: '', status: '' }
let proximoId = 1;
let criando = false;

export function configurar() {
  nos.modal = document.getElementById('modalPasta');
  nos.fundo = document.getElementById('fundoModalPasta');
  nos.nome = document.getElementById('pastaNome');
  nos.doc = document.getElementById('pastaDoc');
  nos.aviso = document.getElementById('pastaAviso');
  nos.saida = document.getElementById('pastaSaida');
  nos.btnCopiar = document.getElementById('btnCopiarPasta');
  nos.uploadSecao = document.getElementById('pastaUploadSecao');
  nos.arquivosInput = document.getElementById('pastaArquivosInput');
  nos.listaArquivos = document.getElementById('pastaListaArquivos');
  nos.btnCriar = document.getElementById('btnCriarPasta');
  nos.resultado = document.getElementById('pastaResultado');

  document.getElementById('btnFecharModalPasta').addEventListener('click', fechar);
  nos.fundo.addEventListener('click', fechar);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !nos.modal.hidden) fechar();
  });

  nos.nome.addEventListener('input', atualizar);
  nos.doc.addEventListener('input', atualizar);
  nos.btnCopiar.addEventListener('click', copiar);

  nos.arquivosInput.addEventListener('change', () => {
    for (const arquivo of nos.arquivosInput.files) {
      arquivos.push({ id: proximoId++, arquivo, tipo: '', status: '' });
    }
    nos.arquivosInput.value = ''; // permite escolher o mesmo arquivo de novo se remover e reconsiderar
    desenharListaArquivos();
    atualizarBotaoCriar();
  });
  nos.btnCriar.addEventListener('click', criarPasta);
}

export function abrir() {
  nos.nome.value = '';
  nos.doc.value = '';
  arquivos = [];
  criando = false;
  limpar(nos.resultado);
  nos.uploadSecao.hidden = !estado.fonte?.criarOuAcharPastaColaborador;
  desenharListaArquivos();
  nos.modal.hidden = false;
  nos.fundo.hidden = false;
  atualizar();
  nos.nome.focus();
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
  const completo = digitos.length === 11 || digitos.length === 14;

  if (!nome && !digitos) {
    definirAviso('Preencha o nome completo e o CPF ou CNPJ.', 'atencao');
  } else if (!nome) {
    definirAviso('Falta o nome completo.', 'atencao');
  } else if (!completo) {
    definirAviso(
      `A sincronização só reconhece CPF (11 dígitos) ou CNPJ (14 dígitos) — `
      + `agora tem ${digitos.length} dígito(s). Confira antes de criar a pasta.`,
      'atencao'
    );
  } else {
    definirAviso(digitos.length === 11 ? 'CPF — colaborador CLT.' : 'CNPJ — colaborador PJ.', 'ok');
  }

  const pronto = Boolean(nome) && completo;
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
    ]);
    select.addEventListener('change', () => {
      item.tipo = select.value;
      atualizarBotaoCriar();
    });

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
      btnRemover,
      item.status ? el('span', { class: 'pasta-arquivo-status', texto: item.status }) : null,
    ]));
  }
}

function atualizarBotaoCriar() {
  if (!nos.btnCriar) return;
  const prontoDados = Boolean(nos.saida.value);
  const arquivosOk = arquivos.length > 0 && arquivos.every((a) => a.tipo);
  nos.btnCriar.disabled = criando || !prontoDados || !arquivosOk;
}

async function criarPasta() {
  if (criando || !estado.fonte?.criarOuAcharPastaColaborador) return;
  criando = true;
  nos.btnCriar.disabled = true;
  nos.btnCriar.textContent = 'Criando pasta…';
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
        const nomeArquivo = `${item.tipo}${extensao}`;
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
    nos.btnCriar.textContent = 'Criar pasta no SharePoint';
    desenharListaArquivos();
    atualizarBotaoCriar();
  }
}
