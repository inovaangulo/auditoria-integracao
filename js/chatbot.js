/**
 * Chatbot de duvidas sobre o app - so' busca por palavra-chave numa base de
 * perguntas/respostas fixa (FAQ), sem chamada nenhuma pra fora do navegador.
 * Nasce assim de proposito: o app e' um site estatico no GitHub Pages, sem
 * servidor proprio pra guardar uma chave de API com seguranca - qualquer
 * chave colocada aqui ficaria visivel pra qualquer pessoa que abrisse o
 * codigo-fonte. Por isso a base de respostas usa o Plano de Trabalho como
 * referencial: cobre exatamente o que ja' foi construido e documentado.
 */

import { el } from './ui.js';

const FAQ = [
  {
    chaves: ['login', 'entrar', 'entra', 'conta', 'senha', 'aadsts', 'redirect', 'nao consigo entrar', 'erro ao entrar'],
    resposta: 'Clique em "Entrar com conta Ângulo" e use seu e-mail @angulosocial.com — o mesmo que você já usa no SharePoint. Se aparecer um erro tipo "AADSTS50011" ou "redirect URI", geralmente é o atalho instalado (PWA) com uma versão antiga guardada — desinstale o atalho (menu ⋮ da janela do app → "Desinstalar") e instale de novo pelo navegador.',
  },
  {
    chaves: ['kanban', 'arrastar', 'mover cartao', 'mudar coluna', 'mudar status', 'coluna'],
    resposta: 'No Kanban, arraste o cartão do colaborador para outra coluna (Pendente, Em Análise, Pronto, Aprovado, Reprovado) para mudar o status — grava direto na planilha, sem precisar abrir a ficha.',
  },
  {
    chaves: ['ficha', 'abrir cartao', 'editar colaborador', 'painel lateral', 'gaveta'],
    resposta: 'Clique em qualquer cartão do Kanban ou linha da Lista para abrir a ficha completa do colaborador, com todos os campos, o checklist de documentos e o histórico de alterações.',
  },
  {
    chaves: ['salvar', 'nao salvou', 'esqueci de salvar', 'perdi a edicao', 'fechar sem salvar', 'aviso de alteracao'],
    resposta: 'Depois de editar a ficha, clique em "Salvar" no rodapé — só assim a alteração vai para a planilha. Se você tentar fechar a ficha com algo editado e ainda não salvo, o app avisa antes de descartar, pra evitar perder a edição sem querer.',
  },
  {
    chaves: ['checklist', 'documentos exigidos', 'quais documentos', 'clt', 'pj', 'quantos documentos'],
    resposta: 'O checklist muda de acordo com o vínculo: CLT pede 10 documentos, PJ pede 15 — o app troca a lista automaticamente conforme o campo "Tipo" da ficha.',
  },
  {
    chaves: ['alerta', 'cor do alerta', 'vermelho', 'ambar', 'amarelo', 'cinza', 'revisar', 'o que significa a cor'],
    resposta: 'As cores dos alertas têm significados diferentes: vermelho = crítico (prazo estourado ou parado há muito tempo), âmbar = atenção (prazo se aproximando), cinza ("revisar") = a conferência automática não encontrou o nome do colaborador dentro de um documento — vale abrir e confirmar se é o arquivo certo.',
  },
  {
    chaves: ['data de entrada', 'periodo', 'quando entrou', 'entrada do colaborador'],
    resposta: 'A "Data de entrada" aparece na coluna "Entrada" da Lista, no Dashboard e em cada alerta — é gravada automaticamente no momento em que o colaborador é cadastrado a partir da pasta no SharePoint.',
  },
  {
    chaves: ['responsavel adm', 'filtro responsavel', 'quem cuida', 'meus colaboradores'],
    resposta: 'O filtro "Responsável ADM" (acima do Kanban/Lista) mostra só os colaboradores daquela pessoa — o campo mostra o nome, mas por trás guarda o e-mail, que é pra onde vai o resumo diário de alertas.',
  },
  {
    chaves: ['buscar', 'procurar', 'pesquisar', 'achar colaborador'],
    resposta: 'Use o campo "Buscar" acima do Kanban — funciona por nome, CPF, CNPJ ou cargo.',
  },
  {
    chaves: ['exportar', 'baixar planilha', 'gerar excel'],
    resposta: 'Clique em "Exportar planilha" no topo do app — baixa um arquivo Excel com os dados que estão sendo exibidos no momento (respeitando os filtros aplicados).',
  },
  {
    chaves: ['importar', 'carregar planilha', 'modo local', 'sem sharepoint'],
    resposta: 'O botão "Importar planilha" só aparece no modo local (sem conta do SharePoint conectada) — serve pra carregar um arquivo Excel manualmente. No dia a dia, com a conta @angulosocial.com conectada, os dados já vêm direto do SharePoint, sem precisar importar nada.',
  },
  {
    chaves: ['sincronizacao', 'sincronizar', 'cadastro automatico', 'pasta cria cadastro', 'como funciona a automacao'],
    resposta: 'A cada 3 horas (em horário comercial), uma rotina automática olha as pastas dentro de DOCUMENTOS_INTEGRACAO no SharePoint: pasta nova vira colaborador novo na planilha, e cada documento reconhecido dentro da pasta marca o campo correspondente como "Recebido" — sem ninguém precisar mexer no app.',
  },
  {
    chaves: ['nome da pasta', 'como nomear pasta', 'padrao de pasta', 'criar pasta colaborador'],
    resposta: 'A pasta do colaborador deve se chamar CPF (ou CNPJ)_Nome_completo — ex.: "111.222.333-44_Ana_Paula_Ribeiro". Use o botão "Gerar nome de pasta" no topo do app pra montar isso certinho, sem risco de erro de formatação.',
  },
  {
    chaves: ['nome do arquivo', 'como nomear documento', 'aso', 'rg', 'cnh', 'tipo de documento no arquivo'],
    resposta: 'Dentro da pasta do colaborador, o nome do arquivo deve terminar com a sigla do tipo de documento — ex.: "ASO.pdf", "RG.pdf", "CTPS.pdf". Não precisa repetir CPF/Nome no arquivo, já que a pasta em volta já identifica de quem é.',
  },
  {
    chaves: ['gerador de pasta', 'gerar nome de pasta', 'botao gerar'],
    resposta: 'O botão "Gerar nome de pasta" (topo do app) monta o nome certo da pasta a partir do nome completo e do CPF/CNPJ digitados — reduz o erro de digitação mais comum na hora de criar a pasta no SharePoint.',
  },
  {
    chaves: ['e-mail de alerta', 'resumo diario', 'recebo email', 'notificacao por email', 'alerta por email'],
    resposta: 'Todo dia útil às 8h, quem tem colaborador com alerta em aberto recebe um e-mail-resumo, um por Responsável ADM, listando só os próprios colaboradores com pendência.',
  },
  {
    chaves: ['instalar', 'atalho', 'area de trabalho', 'pwa', 'icone do app'],
    resposta: 'No Chrome/Edge, abra o app e procure o ícone de instalação na barra de endereço (ou o menu ⋮ → "Instalar app"). Isso cria um atalho de verdade na área de trabalho/Menu Iniciar, com o ícone do projeto.',
  },
  {
    chaves: ['atualizar', 'nova versao', 'aviso de atualizacao', 'versao antiga'],
    resposta: 'Quando alguém publica uma mudança no app, aparece uma faixa avisando "nova versão disponível" pra quem estiver com a tela aberta, com um botão pra recarregar — assim todo mundo sabe que a alteração pedida já está valendo.',
  },
  {
    chaves: ['excluir colaborador', 'apagar cadastro', 'remover colaborador', 'cadastro errado'],
    resposta: 'Abra a ficha do colaborador e clique em "Excluir colaborador" no rodapé — pede confirmação antes, remove a linha de verdade da planilha e registra quem excluiu e quando.',
  },
  {
    chaves: ['nao carrega', 'nao aparece nada', 'tela em branco', 'erro generico', 'sem internet'],
    resposta: 'Confira se está logado com a conta @angulosocial.com certa e se tem acesso à pasta da planilha no SharePoint. Se persistir, tente um recarregamento forçado (Ctrl+Shift+R) — o GitHub Pages guarda os arquivos por até 10 minutos, então um F5 comum às vezes não é suficiente logo depois de uma atualização.',
  },
];

const RESPOSTA_PADRAO = 'Não encontrei essa pergunta na minha base — tenta reformular com outras palavras, ou fala direto com a Sara Cantão. Algumas coisas que sei explicar: login, Kanban, salvar a ficha, cores dos alertas, filtro por responsável, exportar/importar planilha, como nomear pasta e arquivo, gerador de nome de pasta, e-mail de alerta, instalar o app e aviso de nova versão.';

function normalizar(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ');
}

function responderPergunta(pergunta) {
  const texto = normalizar(pergunta);
  if (!texto.trim()) return RESPOSTA_PADRAO;

  let melhor = null;
  let melhorPontos = 0;
  for (const item of FAQ) {
    let pontos = 0;
    for (const chave of item.chaves) {
      if (texto.includes(normalizar(chave))) pontos += chave.split(' ').length;
    }
    if (pontos > melhorPontos) {
      melhorPontos = pontos;
      melhor = item;
    }
  }
  return melhor ? melhor.resposta : RESPOSTA_PADRAO;
}

function mensagem(texto, autor) {
  return el('div', { class: `chatbot-msg ${autor}` }, [texto]);
}

function montarPainel() {
  const corpo = el('div', { class: 'chatbot-corpo', id: 'chatbotCorpo' }, [
    mensagem('Oi! Posso ajudar com dúvidas sobre como usar o app de Auditoria de Integração — login, Kanban, salvar, alertas, filtros, exportar planilha, nomear pasta/arquivo, e-mail de alerta, instalar o app... Pode perguntar.', 'bot'),
  ]);

  const input = el('input', { type: 'text', id: 'chatbotInput', placeholder: 'Digite sua dúvida…' });

  const form = el('form', { class: 'chatbot-form', id: 'chatbotForm' }, [
    input,
    el('button', { class: 'btn-primario', type: 'submit', texto: 'Enviar' }),
  ]);

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const pergunta = input.value.trim();
    if (!pergunta) return;
    corpo.append(mensagem(pergunta, 'usuario'));
    corpo.append(mensagem(responderPergunta(pergunta), 'bot'));
    input.value = '';
    corpo.scrollTop = corpo.scrollHeight;
  });

  return el('div', { class: 'painel-chatbot', id: 'painelChatbot', hidden: true, role: 'dialog', 'aria-label': 'Dúvidas sobre o app' }, [
    el('div', { class: 'chatbot-topo' }, [
      el('span', { texto: 'Dúvidas sobre o app' }),
      el('button', { class: 'btn-fechar', id: 'btnFecharChatbot', 'aria-label': 'Fechar', html: '&times;' }),
    ]),
    corpo,
    form,
  ]);
}

export function iniciar() {
  const botao = el('button', { class: 'btn-chatbot', id: 'btnChatbot', 'aria-label': 'Dúvidas sobre o app', texto: '💬' });
  const painel = montarPainel();

  document.body.append(botao, painel);

  botao.addEventListener('click', () => {
    painel.hidden = !painel.hidden;
    if (!painel.hidden) document.getElementById('chatbotInput')?.focus();
  });
  painel.querySelector('#btnFecharChatbot').addEventListener('click', () => {
    painel.hidden = true;
  });
}
