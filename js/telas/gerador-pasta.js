/**
 * Gerador do nome de pasta que a ADM cria no SharePoint para dar entrada num
 * colaborador novo (padrão CPF/CNPJ_Nome completo).
 *
 * Espelha exatamente a lógica que a sincronização automática usa para separar
 * o nome de volta (nomePasta/novoRegistroDaPasta em
 * AuditoriaIntegracaoAutomacao/scripts/sincronizar-documentos.mjs) - só a
 * barra do CNPJ vira "-" (SharePoint proíbe barra em nome de pasta), o resto
 * da pontuação fica. Reduz o erro mais comum (formatação errada); não
 * substitui conferir se o CPF/CNPJ em si está certo.
 */

const nos = {};

export function configurar() {
  nos.modal = document.getElementById('modalPasta');
  nos.fundo = document.getElementById('fundoModalPasta');
  nos.nome = document.getElementById('pastaNome');
  nos.doc = document.getElementById('pastaDoc');
  nos.aviso = document.getElementById('pastaAviso');
  nos.saida = document.getElementById('pastaSaida');
  nos.btnCopiar = document.getElementById('btnCopiarPasta');

  document.getElementById('btnFecharModalPasta').addEventListener('click', fechar);
  nos.fundo.addEventListener('click', fechar);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !nos.modal.hidden) fechar();
  });

  nos.nome.addEventListener('input', atualizar);
  nos.doc.addEventListener('input', atualizar);
  nos.btnCopiar.addEventListener('click', copiar);
}

export function abrir() {
  nos.nome.value = '';
  nos.doc.value = '';
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
