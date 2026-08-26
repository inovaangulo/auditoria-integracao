/**
 * Espelho da aba "Cadastro de Documentos" do Painel_Controle_Integracao_Trivia_Tabela.xlsx.
 *
 * A ordem de COLUNAS tem que bater exatamente com a planilha (A ate AV): tanto a
 * importacao do .xlsx quanto a API do Graph devolvem a linha como um array
 * posicional, e e' por essa ordem que a linha vira objeto e volta a ser linha.
 * Se alguem inserir uma coluna na planilha, inclua-a aqui na mesma posicao.
 */

export const COLUNAS = [
  'Data de entrada',                        // A  - gravada uma vez, na criação do cadastro
  'Nome completo',                          // B
  'CPF',                                    // C
  'CNPJ (se PJ)',                           // D
  'Tipo',                                   // E
  'Cliente atual',                          // F
  'Cargo / Função',                         // G
  'Doc: RG ou CNH',                         // H
  'Doc: Comprovante de Endereço',           // I
  'Doc: Carteira de Trabalho (CLT)',        // J
  'Doc: CCMEI (PJ)',                        // K
  'Documentos completos?',                  // L  - calculado
  'Status atual',                           // M
  'Data envio p/ assinatura',               // N
  'Dias aguardando assinatura',             // O  - calculado
  'Alerta cobrança assinatura',             // P  - calculado
  'Data cadastro empresa Wehandle (PJ)',    // Q
  'Dias sem confirmação (PJ)',              // R  - calculado
  'Alerta confirmação pendente (PJ)',       // S  - calculado
  'Data envio p/ análise Wehandle',         // T
  'Dias sem confirmação',                   // U  - calculado
  'Situação prazo Wehandle',                // V  - calculado
  'Consistência do status',                 // W  - calculado
  'Resultado análise',                      // X
  'Motivo reprovação',                      // Y
  'Data aprovação',                         // Z
  'Data integração agendada',               // AA
  'Responsável ADM',                        // AB
  'WhatsApp contato',                       // AC
  'Clientes / projetos em que já atuou',    // AD
  'Observações',                            // AE
  'CPF (só números)',                       // AF - calculado
  'CNPJ (só números)',                      // AG - calculado
  'Doc: Ordem de Serviço',                  // AH
  'Doc: Ficha de Entrega de EPI',           // AI
  'Doc: Treinamento NR-18',                 // AJ
  'Doc: Treinamento NR-06',                 // AK
  'Doc: ASO',                               // AL
  'Doc: Foto',                              // AM
  'Doc: CNH (condicional - só quando a função exige)',  // AN
  'Doc: Cadastro no eSocial (CLT)',         // AO
  'Doc: Contrato de Prestação de Serviço (PJ)',         // AP
  'Doc: APR (PJ)',                          // AQ
  'Doc: Declaração Atendimento Leis Trabalhistas (PJ)', // AR
  'Doc: Declaração Inexistência de Vínculo (PJ)',       // AS
  'Doc: Declaração Inexistência de Riscos (PJ)',        // AT
  'Doc: Relação dos Alojamentos (PJ)',      // AU
  'Alerta verificação de conteúdo',         // AV - lista dos documentos com nome não conferido; ADM apaga ao revisar
];

/**
 * Pessoas do ADM que podem ser Responsável ADM de um colaborador. O e-mail
 * é o que vai na planilha (e' pra onde o resumo diario de alertas e' enviado) -
 * lista fixa porque quem entra/sai do ADM nao muda toda hora. Atualize aqui
 * se a equipe mudar.
 */
export const RESPONSAVEIS_ADM = [
  { nome: 'Miriã Antunes', email: 'miria.antunes@angulosocial.com' },
  { nome: 'Ludmylla Antunes', email: 'ludmylla.antunes@angulosocial.com' },
  { nome: 'Sara Cantão', email: 'sara.cantao@angulosocial.com' }, // temporário, só para teste (18/08/2026) - remover depois
];

/** Colunas derivadas por regra de negocio - o app recalcula e sobrescreve ao salvar. */
export const COLUNAS_CALCULADAS = new Set([
  'Documentos completos?', 'Dias aguardando assinatura', 'Alerta cobrança assinatura',
  'Dias sem confirmação (PJ)', 'Alerta confirmação pendente (PJ)', 'Dias sem confirmação',
  'Situação prazo Wehandle', 'Consistência do status', 'CPF (só números)', 'CNPJ (só números)',
]);

// ---------------------------------------------------------------------------
// Checklist de documentos
// ---------------------------------------------------------------------------
// vinculo: 'todos' cobra de CLT e PJ; 'CLT'/'PJ' so' do vinculo correspondente.
// condicional: nao derruba o status quando ausente (ex.: CNH so' se a funcao exige).

// "Conferido automaticamente" so' e' atingido pela sincronizacao quando o
// tipo passa pela conferencia de conteudo E o nome bate (schema.js -
// VERIFICAR_NOME_POR_ABREV) - tipos pulados (RG, CNH...), com nome
// divergente ou com arquivo ilegivel ficam em "Pendente de conferência manual"
// ate' um humano confirmar escolhendo "Conferido manualmente" (pedido da
// Sara, 19/08/2026 - antes so' existia "Recebido"/"Pendente").
export const VALORES_DOC = ['Conferido automaticamente', 'Conferido manualmente', 'Pendente de conferência manual', 'Não recebido', 'Não se aplica'];

// `abrevs`: os codigos de TIPODOC aceitos no nome do arquivo
// (padrao CPF/CNPJ_Nome_TIPODOC), usados pela sincronizacao automatica com
// pastas do SharePoint. Mais de um codigo pode apontar para o mesmo campo
// (ex.: RG e CNH satisfazem "RG ou CNH"); o primeiro da lista e' o preferido
// na hora de nomear um arquivo novo.
// `verificarNome: false`: documento tipicamente escaneado/assinado como
// imagem, sem texto legivel extraivel do PDF - a sincronizacao pula a
// conferencia de nome nesses casos (mesmo criterio da skill de auditoria de
// pastas locais), em vez de arriscar um falso alarme.
// `clientes`: se presente, o documento so' e' exigido de colaboradores desses
// clientes (match por "Cliente atual", normalizado - ver normalizarCliente).
// `exceto`: se presente, o documento e' exigido de todo mundo MENOS desses
// clientes. Nunca usar `clientes` e `exceto` juntos no mesmo item.
// Fonte: DOCUMENTOS DE INTEGRAÇÃO.docx (ADM, conferido com a Sara 26/08/2026).
export const DOCUMENTOS = [
  { campo: 'Doc: RG ou CNH',                          label: 'RG ou CNH',                       vinculo: 'todos', abrevs: ['RG', 'CNH'], verificarNome: false },
  { campo: 'Doc: Comprovante de Endereço',            label: 'Comprovante de Endereço',         vinculo: 'CLT', abrevs: ['ENDERECO'] },
  { campo: 'Doc: Ordem de Serviço',                   label: 'Ordem de Serviço',                vinculo: 'todos', abrevs: ['OS'] },
  { campo: 'Doc: Ficha de Entrega de EPI',            label: 'Ficha de Entrega de EPI',         vinculo: 'todos', abrevs: ['EPI'] },
  { campo: 'Doc: Treinamento NR-18',                  label: 'Treinamento NR-18',               vinculo: 'todos', abrevs: ['NR18'], verificarNome: false, clientes: ['Trivia'] },
  { campo: 'Doc: Treinamento NR-06',                  label: 'Treinamento NR-06',               vinculo: 'todos', abrevs: ['NR06'], verificarNome: false, exceto: ['Motiva Pantanal'] },
  { campo: 'Doc: ASO',                                label: 'ASO',                             vinculo: 'todos', abrevs: ['ASO'] },
  { campo: 'Doc: Foto',                               label: 'Foto',                            vinculo: 'todos', abrevs: ['FOTO'], clientes: ['Trivia'] },
  { campo: 'Doc: CNH (condicional - só quando a função exige)',
    label: 'CNH (só se a função exige)', vinculo: 'todos', condicional: true, abrevs: ['CNH'], verificarNome: false },

  { campo: 'Doc: Carteira de Trabalho (CLT)',         label: 'Carteira de Trabalho (CTPS)',     vinculo: 'CLT', abrevs: ['CTPS'], verificarNome: false },
  { campo: 'Doc: Cadastro no eSocial (CLT)',          label: 'Cadastro no eSocial',             vinculo: 'CLT', abrevs: ['ESOCIAL'], clientes: ['Trivia'] },

  { campo: 'Doc: CCMEI (PJ)',                         label: 'CCMEI',                           vinculo: 'PJ', abrevs: ['CCMEI'], clientes: ['Trivia'] },
  { campo: 'Doc: Contrato de Prestação de Serviço (PJ)', label: 'Contrato de Prestação de Serviço', vinculo: 'PJ', abrevs: ['CONTRATO'] },
  { campo: 'Doc: APR (PJ)',                           label: 'APR (Análise Preliminar de Risco)', vinculo: 'PJ', abrevs: ['APR'], verificarNome: false, clientes: ['Trivia'] },
  { campo: 'Doc: Declaração Atendimento Leis Trabalhistas (PJ)',
    label: 'Declaração de Atendimento às Leis Trabalhistas', vinculo: 'PJ', abrevs: ['DECLLEIS'], clientes: ['Trivia'] },
  { campo: 'Doc: Declaração Inexistência de Vínculo (PJ)',
    label: 'Declaração de Inexistência de Vínculo', vinculo: 'PJ', abrevs: ['DECLVINCULO'], clientes: ['Trivia'] },
  { campo: 'Doc: Declaração Inexistência de Riscos (PJ)',
    label: 'Declaração de Inexistência de Riscos', vinculo: 'PJ', abrevs: ['DECLRISCOS'], clientes: ['Trivia'] },
  { campo: 'Doc: Relação dos Alojamentos (PJ)',       label: 'Relação dos Alojamentos',         vinculo: 'PJ', abrevs: ['ALOJAMENTO'], verificarNome: false, clientes: ['Trivia', 'Motiva Pantanal'] },
];

/** Normaliza nome de cliente pra comparação (sem acento, sem maiúscula, sem espaço nas pontas). */
export function normalizarCliente(nome) {
  return (nome || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

/**
 * Sigla (TIPODOC) -> rotulo pra mostrar num menu (ex.: gerador de pasta).
 * Quando um campo aceita mais de uma sigla (RG ou CNH), cada sigla usa o
 * proprio nome como rotulo em vez do rotulo combinado do campo - senao "RG"
 * e "CNH" apareceriam os dois como "RG ou CNH" no menu, sem diferenciar.
 */
export const OPCOES_TIPODOC = (() => {
  const mapa = new Map();
  for (const doc of DOCUMENTOS) {
    for (const abrev of doc.abrevs || []) {
      if (!mapa.has(abrev)) mapa.set(abrev, doc.abrevs.length > 1 ? abrev : doc.label);
    }
  }
  return [...mapa.entries()].map(([valor, rotulo]) => ({ valor, rotulo }));
})();

/** Mapa TIPODOC (maiusculo, sem acento) -> lista de campos que ele satisfaz. */
export const CAMPOS_POR_ABREV = (() => {
  const mapa = {};
  for (const doc of DOCUMENTOS) {
    for (const abrev of doc.abrevs || []) {
      (mapa[abrev] ||= []).push(doc.campo);
    }
  }
  return mapa;
})();

/** Mapa TIPODOC -> se vale a pena conferir o nome do colaborador no conteúdo do arquivo. */
export const VERIFICAR_NOME_POR_ABREV = (() => {
  const mapa = {};
  for (const doc of DOCUMENTOS) {
    for (const abrev of doc.abrevs || []) {
      if (doc.verificarNome === false) mapa[abrev] = false;
      else if (!(abrev in mapa)) mapa[abrev] = true;
    }
  }
  return mapa;
})();

/**
 * Documentos exigidos do vinculo informado (CLT ou PJ) e, se informado, do
 * cliente do colaborador - documentos com `clientes` so' entram se o cliente
 * bater com a lista, documentos com `exceto` entram pra qualquer cliente que
 * NAO bata com a lista. Sem `cliente` informado, aplica so' o filtro de vinculo
 * (usado quando ainda nao se sabe o cliente, ex.: tela de novo cadastro vazia).
 */
export function documentosDoVinculo(tipo, cliente) {
  const alvo = cliente === undefined ? null : normalizarCliente(cliente);
  return DOCUMENTOS.filter((d) => {
    if (d.vinculo !== 'todos' && d.vinculo !== tipo) return false;
    if (alvo === null) return true;
    if (d.clientes) return d.clientes.some((c) => normalizarCliente(c) === alvo);
    if (d.exceto) return !d.exceto.some((c) => normalizarCliente(c) === alvo);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Kanban
// ---------------------------------------------------------------------------
// Cada coluna casa um ou mais valores de "Status atual". Ao arrastar um cartao,
// o status gravado e' `statusPadrao` - por isso colunas que agrupam varios
// status (Em Analise) precisam declarar qual deles e' o padrao.

export const COLUNAS_KANBAN = [
  {
    id: 'pendente', titulo: 'Pendente', cor: '#6b7280',
    status: ['Documento em elaboração'],
    statusPadrao: 'Documento em elaboração',
  },
  {
    id: 'analise', titulo: 'Em Análise', cor: '#b7860b',
    status: ['Em análise Wehandle', 'Aguardando confirmação do prestador', 'Aguardando confirmação'],
    statusPadrao: 'Em análise Wehandle',
  },
  {
    id: 'pronto', titulo: 'Pronto', cor: '#2e7d5b',
    status: ['Aguardando assinatura'],
    statusPadrao: 'Aguardando assinatura',
  },
  {
    id: 'aprovado', titulo: 'Aprovado', cor: '#1e5a3f',
    status: ['Aprovado'],
    statusPadrao: 'Aprovado',
  },
  {
    id: 'reprovado', titulo: 'Reprovado', cor: '#c1272d',
    status: ['Reprovado - em correção'],
    statusPadrao: 'Reprovado - em correção',
  },
];

/** Todos os status validos, na ordem em que aparecem no fluxo. */
export const STATUS_VALIDOS = COLUNAS_KANBAN.flatMap((c) => c.status);

export function colunaDoStatus(status) {
  const alvo = (status || '').trim();
  const col = COLUNAS_KANBAN.find((c) => c.status.includes(alvo));
  return col ? col.id : 'pendente';  // sem status reconhecido, trata como nao iniciado
}

// ---------------------------------------------------------------------------
// Parametros (espelham a aba "Parâmetros" da planilha)
// ---------------------------------------------------------------------------

export const PARAMETROS = {
  slaAnaliseWehandleDiasUteis: 2,
  limiteAlertaAssinaturaDias: 3,
  limiteAlertaConfirmacaoPjDias: 2,
};

/** Registro vazio, com todas as colunas presentes para o round-trip da planilha. */
export function registroVazio() {
  return Object.fromEntries(COLUNAS.map((c) => [c, '']));
}
