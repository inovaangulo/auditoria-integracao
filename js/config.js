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
    clientId: '',

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
};

export const MODO_SHAREPOINT = Boolean(CONFIG.azure.clientId);
