/**
 * Espelho da aba "Cadastro de Documentos" do Painel_Controle_Integracao_Trivia_Tabela.xlsx.
 *
 * A ordem de COLUNAS tem que bater exatamente com a planilha (A ate AT): tanto a
 * importacao do .xlsx quanto a API do Graph devolvem a linha como um array
 * posicional, e e' por essa ordem que a linha vira objeto e volta a ser linha.
 * Se alguem inserir uma coluna na planilha, inclua-a aqui na mesma posicao.
 */

export const COLUNAS = [
  'Nome completo',                          // A
  'CPF',                                    // B
  'CNPJ (se PJ)',                           // C
  'Tipo',                                   // D
  'Cliente atual',                          // E
  'Cargo / Função',                         // F
  'Doc: RG ou CNH',                         // G
  'Doc: Comprovante de Endereço',           // H
  'Doc: Carteira de Trabalho (CLT)',        // I
  'Doc: CCMEI (PJ)',                        // J
  'Documentos completos?',                  // K  - calculado
  'Status atual',                           // L
  'Data envio p/ assinatura',               // M
  'Dias aguardando assinatura',             // N  - calculado
  'Alerta cobrança assinatura',             // O  - calculado
  'Data cadastro empresa Wehandle (PJ)',    // P
  'Dias sem confirmação (PJ)',              // Q  - calculado
  'Alerta confirmação pendente (PJ)',       // R  - calculado
  'Data envio p/ análise Wehandle',         // S
  'Dias sem confirmação',                   // T  - calculado
  'Situação prazo Wehandle',                // U  - calculado
  'Consistência do status',                 // V  - calculado
  'Resultado análise',                      // W
  'Motivo reprovação',                      // X
  'Data aprovação',                         // Y
  'Data integração agendada',               // Z
  'Responsável ADM',                        // AA
  'WhatsApp contato',                       // AB
  'Clientes / projetos em que já atuou',    // AC
  'Observações',                            // AD
  'CPF (só números)',                       // AE - calculado
  'CNPJ (só números)',                      // AF - calculado
  'Doc: Ordem de Serviço',                  // AG
  'Doc: Ficha de Entrega de EPI',           // AH
  'Doc: Treinamento NR-18',                 // AI
  'Doc: Treinamento NR-06',                 // AJ
  'Doc: ASO',                               // AK
  'Doc: Foto',                              // AL
  'Doc: CNH (condicional - só quando a função exige)',  // AM
  'Doc: Cadastro no eSocial (CLT)',         // AN
  'Doc: Contrato de Prestação de Serviço (PJ)',         // AO
  'Doc: APR (PJ)',                          // AP
  'Doc: Declaração Atendimento Leis Trabalhistas (PJ)', // AQ
  'Doc: Declaração Inexistência de Vínculo (PJ)',       // AR
  'Doc: Declaração Inexistência de Riscos (PJ)',        // AS
  'Doc: Relação dos Alojamentos (PJ)',      // AT
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

export const VALORES_DOC = ['Recebido', 'Pendente', 'Não se aplica'];

// `abrevs`: os codigos de TIPODOC aceitos no nome do arquivo
// (padrao CPF/CNPJ_Nome_TIPODOC), usados pela sincronizacao automatica com
// pastas do SharePoint. Mais de um codigo pode apontar para o mesmo campo
// (ex.: RG e CNH satisfazem "RG ou CNH"); o primeiro da lista e' o preferido
// na hora de nomear um arquivo novo.
// `verificarNome: false`: documento tipicamente escaneado/assinado como
// imagem, sem texto legivel extraivel do PDF - a sincronizacao pula a
// conferencia de nome nesses casos (mesmo criterio da skill de auditoria de
// pastas locais), em vez de arriscar um falso alarme.
export const DOCUMENTOS = [
  { campo: 'Doc: RG ou CNH',                          label: 'RG ou CNH',                       vinculo: 'todos', abrevs: ['RG', 'CNH'], verificarNome: false },
  { campo: 'Doc: Comprovante de Endereço',            label: 'Comprovante de Endereço',         vinculo: 'todos', abrevs: ['ENDERECO'] },
  { campo: 'Doc: Ordem de Serviço',                   label: 'Ordem de Serviço',                vinculo: 'todos', abrevs: ['OS'] },
  { campo: 'Doc: Ficha de Entrega de EPI',            label: 'Ficha de Entrega de EPI',         vinculo: 'todos', abrevs: ['EPI'] },
  { campo: 'Doc: Treinamento NR-18',                  label: 'Treinamento NR-18',               vinculo: 'todos', abrevs: ['NR18'], verificarNome: false },
  { campo: 'Doc: Treinamento NR-06',                  label: 'Treinamento NR-06',               vinculo: 'todos', abrevs: ['NR06'], verificarNome: false },
  { campo: 'Doc: ASO',                                label: 'ASO',                             vinculo: 'todos', abrevs: ['ASO'] },
  { campo: 'Doc: Foto',                               label: 'Foto',                            vinculo: 'todos', abrevs: ['FOTO'] },
  { campo: 'Doc: CNH (condicional - só quando a função exige)',
    label: 'CNH (só se a função exige)', vinculo: 'todos', condicional: true, abrevs: ['CNH'], verificarNome: false },

  { campo: 'Doc: Carteira de Trabalho (CLT)',         label: 'Carteira de Trabalho (CTPS)',     vinculo: 'CLT', abrevs: ['CTPS'], verificarNome: false },
  { campo: 'Doc: Cadastro no eSocial (CLT)',          label: 'Cadastro no eSocial',             vinculo: 'CLT', abrevs: ['ESOCIAL'] },

  { campo: 'Doc: CCMEI (PJ)',                         label: 'CCMEI',                           vinculo: 'PJ', abrevs: ['CCMEI'] },
  { campo: 'Doc: Contrato de Prestação de Serviço (PJ)', label: 'Contrato de Prestação de Serviço', vinculo: 'PJ', abrevs: ['CONTRATO'] },
  { campo: 'Doc: APR (PJ)',                           label: 'APR (Análise Preliminar de Risco)', vinculo: 'PJ', abrevs: ['APR'], verificarNome: false },
  { campo: 'Doc: Declaração Atendimento Leis Trabalhistas (PJ)',
    label: 'Declaração de Atendimento às Leis Trabalhistas', vinculo: 'PJ', abrevs: ['DECLLEIS'] },
  { campo: 'Doc: Declaração Inexistência de Vínculo (PJ)',
    label: 'Declaração de Inexistência de Vínculo', vinculo: 'PJ', abrevs: ['DECLVINCULO'] },
  { campo: 'Doc: Declaração Inexistência de Riscos (PJ)',
    label: 'Declaração de Inexistência de Riscos', vinculo: 'PJ', abrevs: ['DECLRISCOS'] },
  { campo: 'Doc: Relação dos Alojamentos (PJ)',       label: 'Relação dos Alojamentos',         vinculo: 'PJ', abrevs: ['ALOJAMENTO'], verificarNome: false },
];

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

/** Documentos exigidos do vinculo informado (CLT ou PJ). */
export function documentosDoVinculo(tipo) {
  return DOCUMENTOS.filter((d) => d.vinculo === 'todos' || d.vinculo === tipo);
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
