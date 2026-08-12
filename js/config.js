/**
 * Configuracao do app.
 *
 * Enquanto `azure.clientId` estiver vazio, o app roda em MODO LOCAL: os dados
 * ficam no navegador de quem abriu e a planilha entra/sai por importar/exportar.
 * Assim da' pra usar e validar a tela antes de ter o registro no Azure AD.
 *
 * Preenchendo o clientId, o app passa a MODO SHAREPOINT: login com a conta
 * @angulosocial.com e leitura/escrita direto na planilha. O passo a passo do
 * registro esta' no README.
 *
 * Nao ha' segredo aqui: clientId e' identificador publico, nao senha. Nunca
 * coloque client secret neste arquivo - ele vai para um repositorio publico.
 */

export const CONFIG = {
  azure: {
    // Cole aqui o "ID do aplicativo (cliente)" do registro no Azure AD.
    clientId: '5b9ed096-52d8-4ff5-b880-92c71c6e38d8',

    // Dominio verificado do locatario. Restringe o login a contas da Angulo.
    authority: 'https://login.microsoftonline.com/angulosocial.com',

    // Permissao delegada: o app so' enxerga o que a pessoa logada ja' pode ver.
    scopes: ['Files.ReadWrite.All', 'User.Read'],
  },

  /**
   * Localizacao da planilha no SharePoint.
   * driveId/itemId foram obtidos do proprio arquivo e sao estaveis: continuam
   * validos se a planilha for renomeada ou movida dentro da mesma biblioteca.
   */
  planilha: {
    driveId: 'b!zHcvxaJ_3EWeu_IIcSkJGJse6zz--aVBtoGM9o_wvxZ5Uk_kTBwJQZamP3oQiS9m',
    itemId: '01Y3M4WXOWDJYHXU6LYJEZLV6MB2WQCLCN',
    aba: 'Cadastro de Documentos',
    webUrl: 'https://angulosocialbr.sharepoint.com/sites/AUTOMACAOINOVACAO/Documentos%20Compartilhados/PROJETOS_IA/ADM/Painel_Controle_Integracao_Trivia_Tabela.xlsx',
  },

  /** Quantas alteracoes guardar no historico de cada colaborador. */
  limiteHistorico: 30,

  /**
   * ID do locatario (Entra ID) da Angulo Social. Usado pelo script de
   * sincronizacao (scripts/sincronizar-documentos.mjs) para trocar o token
   * OIDC do GitHub Actions por um token do Microsoft Graph.
   */
  tenantId: '51a014a5-c7a0-451b-86d1-658222d9c5bd',

  /**
   * Onde ficam as pastas de documentos por colaborador (sincronizacao
   * automatica com o SharePoint). Site diferente do da planilha - por isso
   * tem o proprio siteId, obtido via Graph Explorer.
   */
  pastasColaboradores: {
    siteId: 'angulosocialbr.sharepoint.com,f34035fd-91eb-43fc-9239-ed17c5a7a20c,98a989fd-111a-4ae0-abf1-78f06ad993c4',
    pastaBase: 'TESTES_IA_ADM',
  },
};

export const MODO_SHAREPOINT = Boolean(CONFIG.azure.clientId);
