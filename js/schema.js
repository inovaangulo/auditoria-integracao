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

export const DOCUMENTOS = [
  { campo: 'Doc: RG ou CNH',                          label: 'RG ou CNH',                       vinculo: 'todos' },
  { campo: 'Doc: Comprovante de Endereço',            label: 'Comprovante de Endereço',         vinculo: 'todos' },
  { campo: 'Doc: Ordem de Serviço',                   label: 'Ordem de Serviço',                vinculo: 'todos' },
  { campo: 'Doc: Ficha de Entrega de EPI',            label: 'Ficha de Entrega de EPI',         vinculo: 'todos' },
  { campo: 'Doc: Treinamento NR-18',                  label: 'Treinamento NR-18',               vinculo: 'todos' },
  { campo: 'Doc: Treinamento NR-06',                  label: 'Treinamento NR-06',               vinculo: 'todos' },
  { campo: 'Doc: ASO',                                label: 'ASO',                             vinculo: 'todos' },
  { campo: 'Doc: Foto',                               label: 'Foto',                            vinculo: 'todos' },
  { campo: 'Doc: CNH (condicional - só quando a função exige)',
    label: 'CNH (só se a função exige)', vinculo: 'todos', condicional: true },

  { campo: 'Doc: Carteira de Trabalho (CLT)',         label: 'Carteira de Trabalho (CTPS)',     vinculo: 'CLT' },
  { campo: 'Doc: Cadastro no eSocial (CLT)',          label: 'Cadastro no eSocial',             vinculo: 'CLT' },

  { campo: 'Doc: CCMEI (PJ)',                         label: 'CCMEI',                           vinculo: 'PJ' },
  { campo: 'Doc: Contrato de Prestação de Serviço (PJ)', label: 'Contrato de Prestação de Serviço', vinculo: 'PJ' },
  { campo: 'Doc: APR (PJ)',                           label: 'APR (Análise Preliminar de Risco)', vinculo: 'PJ' },
  { campo: 'Doc: Declaração Atendimento Leis Trabalhistas (PJ)',
    label: 'Declaração de Atendimento às Leis Trabalhistas', vinculo: 'PJ' },
  { campo: 'Doc: Declaração Inexistência de Vínculo (PJ)',
    label: 'Declaração de Inexistência de Vínculo', vinculo: 'PJ' },
  { campo: 'Doc: Declaração Inexistência de Riscos (PJ)',
    label: 'Declaração de Inexistência de Riscos', vinculo: 'PJ' },
  { campo: 'Doc: Relação dos Alojamentos (PJ)',       label: 'Relação dos Alojamentos',         vinculo: 'PJ' },
];

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
