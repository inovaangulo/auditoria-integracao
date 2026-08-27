/**
 * Chatbot de duvidas sobre o app - sem chamada nenhuma pra fora do navegador
 * (nao ha' servidor proprio pra guardar uma chave de API com seguranca, ja'
 * que o app e' um site estatico no GitHub Pages).
 *
 * Duas camadas de resposta:
 *  1. FAQ curada (abaixo) - respostas escritas a mao, pros topicos mais
 *     comuns. Prioridade, porque ja' saem no tom certo.
 *  2. Base derivada do proprio Plano de Trabalho (plano-trabalho.html,
 *     buscado em tempo real) - cobre qualquer coisa ja' documentada, sem
 *     precisar mapear pergunta por pergunta a mao (impraticavel a longo
 *     prazo). O texto do plano e' escrito em tom de relatorio ("Já temos" /
 *     "Falta" / "Como fazer"), por isso passa por `formatarCard`/`formatarFase`
 *     antes de virar resposta - o documento e' so' a base, nao o que aparece
 *     literalmente na tela.
 */

import { el } from './ui.js';

const FAQ = [
  {
    chaves: ['como usar', 'como uso o app', 'como usar o aplicativo', 'passo a passo', 'primeiro acesso', 'primeira vez', 'como comecar', 'tutorial'],
    resposta: 'Passo a passo básico: 1) abra o link do app e entre com sua conta @angulosocial.com; 2) use os filtros (cliente, responsável, vínculo, situação) ou a busca pra achar quem procura; 3) no Kanban, arraste o cartão pra mudar o status; 4) clique num cartão pra abrir a ficha completa, com o checklist de documentos; 5) depois de editar, clique em "Salvar" antes de fechar; 6) use o Dashboard pra visão geral e a Lista pra buscar como numa planilha. Tudo direto no navegador, sem instalar nada (embora dê pra criar um atalho, se quiser).',
  },
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
    chaves: ['checklist', 'documentos exigidos', 'quais documentos', 'clt', 'pj', 'quantos documentos', 'checklist por cliente', 'documento do cliente'],
    resposta: 'O checklist muda de acordo com o vínculo (CLT/PJ) e também com o cliente atual do colaborador: existe uma base comum a qualquer cliente, e alguns documentos só entram — ou saem, como o Treinamento NR-06 pra Motiva Pantanal — dependendo do cliente. A ficha troca a lista automaticamente conforme os campos "Vínculo" e "Cliente atual".',
  },
  {
    chaves: ['cliente atual', 'selecionar cliente', 'lista de clientes', 'nome do cliente', 'cliente na lista', 'cliente fora da lista'],
    resposta: 'O campo "Cliente atual" da ficha é uma lista de clientes conhecidos (não é mais texto livre) — evita grafia diferente pro mesmo cliente, o que faria o checklist de documentos por cliente não bater certo. Se o cadastro já tinha um valor digitado que não está na lista, ele continua aparecendo, marcado como "(fora da lista)".',
  },
  {
    chaves: ['resolver alerta', 'resolvo o alerta', 'resolver o alerta', 'tirar o alerta', 'sumir o alerta', 'fechar alerta', 'dispensar alerta', 'como faco o alerta sumir'],
    resposta: 'Depende do tipo: o alerta cinza ("revisar") tem ação manual — abra a ficha, confira se o documento é da pessoa certa, apague o texto do campo "Alerta verificação de conteúdo" e salve. Já os alertas vermelho/âmbar (prazo) não têm botão de resolver — eles são calculados automaticamente e desaparecem sozinhos quando a causa muda: complete os documentos faltantes, avance o status do colaborador (ex.: "Aprovado"), ou atualize a data que gera o cálculo.',
  },
  {
    chaves: ['alerta', 'cor do alerta', 'cores dos alertas', 'cores do alerta', 'vermelho', 'ambar', 'amarelo', 'cinza', 'revisar', 'o que significa a cor'],
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
    resposta: 'A cada 3 horas (em horário comercial), uma rotina automática olha as pastas dentro de DOCUMENTOS_INTEGRACAO no SharePoint: pasta nova vira colaborador novo na planilha, e cada documento reconhecido dentro da pasta marca o campo correspondente como "Conferido automaticamente" (quando o conteúdo bate com o nome do colaborador) ou "Pendente de conferência manual" — sem ninguém precisar mexer no app.',
  },
  {
    chaves: ['status do documento', 'conferido automaticamente', 'conferido manualmente', 'pendente de conferencia', 'nao recebido', 'nao se aplica', 'o que significa cada status', 'cores do documento'],
    resposta: 'Cada documento tem um destes status: "Conferido automaticamente" (o robô confirmou que o conteúdo é da pessoa certa), "Conferido manualmente" (alguém do ADM conferiu pela ficha e confirmou — isso também dispensa qualquer alerta de verificação daquele documento), "Pendente de conferência manual" (o arquivo já está na pasta, só falta confirmar — já conta como documentação completa), "Não recebido" e "Não se aplica". Pra confirmar manualmente, é só trocar o valor no próprio dropdown na ficha do colaborador.',
  },
  {
    chaves: ['adicionar colaborador', 'novo colaborador', 'cadastrar colaborador', 'incluir colaborador', 'criar colaborador', 'como cadastro'],
    resposta: 'Não existe um botão de "novo colaborador" separado — use "Criar pasta de colaborador" no topo do app: digite nome e CPF/CNPJ, escolha o tipo de cada documento (ou "Outro" pra um tipo fora da lista) e envie os arquivos. O app cria a pasta de verdade em DOCUMENTOS_INTEGRACAO no SharePoint (ou reaproveita se ela já existir) e sobe cada arquivo já com o nome certo. Em até 3 horas a rotina automática cria a linha na planilha e ele aparece no Kanban, na coluna "Pendente" — depois é só abrir a ficha e completar o "Cliente atual" e os outros dados.',
  },
  {
    chaves: ['nome da pasta', 'como nomear pasta', 'padrao de pasta', 'criar pasta colaborador'],
    resposta: 'A pasta do colaborador se chama CPF (ou CNPJ)_Nome_completo — ex.: "111.222.333-44_Ana_Paula_Ribeiro". Use o botão "Criar pasta de colaborador" no topo do app: ele já cria a pasta de verdade no SharePoint com o nome certo, sem risco de erro de formatação.',
  },
  {
    chaves: ['nome do arquivo', 'como nomear documento', 'aso', 'rg', 'cnh', 'tipo de documento no arquivo'],
    resposta: 'Dentro da pasta do colaborador, o nome do arquivo deve terminar com a sigla do tipo de documento — ex.: "ASO.pdf", "RG.pdf", "CTPS.pdf". Não precisa repetir CPF/Nome no arquivo, já que a pasta em volta já identifica de quem é. Fazendo isso pelo botão "Criar pasta de colaborador", o app já nomeia certinho sozinho.',
  },
  {
    chaves: ['gerador de pasta', 'gerar nome de pasta', 'criar pasta de colaborador', 'botao criar pasta', 'colaborador existente', 'subir documentos', 'adicionar documentos', 'outro tipo de documento', 'link da pasta'],
    resposta: 'O botão "Criar pasta de colaborador" (topo do app) cria a pasta de verdade no SharePoint (ou reaproveita se já existir) e sobe os documentos direto — escolhe o tipo de cada arquivo num menu (ASO, RG, CTPS etc., com opção "Outro" pra digitar um tipo fora da lista) e mostra o link da pasta no SharePoint ao final. Também dá pra buscar um colaborador já existente (por nome, CPF ou CNPJ) pra só completar/adicionar documentos numa pasta que já existe, sem digitar tudo de novo.',
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

const RESPOSTA_PADRAO = 'Não encontrei essa pergunta na minha base — tenta reformular com outras palavras, ou fala direto com a Sara Cantão. Algumas coisas que sei explicar: login, Kanban, salvar a ficha, status e checklist de documentos (inclusive por cliente), cores dos alertas, filtro por responsável, exportar/importar planilha, criar pasta de colaborador, e-mail de alerta, instalar o app e aviso de nova versão.';

const STOPWORDS = new Set([
  'a', 'o', 'as', 'os', 'de', 'da', 'do', 'das', 'dos', 'e', 'é', 'ou', 'um', 'uma', 'uns', 'umas',
  'no', 'na', 'nos', 'nas', 'ao', 'aos', 'com', 'por', 'pra', 'para', 'que', 'se', 'sem', 'sua', 'seu',
  'suas', 'seus', 'como', 'app', 'isso', 'esse', 'essa', 'isto', 'aquele', 'aquela', 'tem', 'ter', 'fazer',
  'faz', 'sobre', 'entao', 'ja', 'mais', 'muito', 'bem', 'eu', 'voce', 'ele', 'ela', 'nao', 'sim', 'ai', 'la',
]);

function normalizar(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ');
}

/** Singular ingenuo (so' pra bater "alertas" com "alerta", "documentos" com "documento" etc). */
function singularizar(t) {
  return t.length > 4 && t.endsWith('s') ? t.slice(0, -1) : t;
}

function tokens(s) {
  return normalizar(s).split(/\s+/).map(singularizar).filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

function textoDe(elemento) {
  return (elemento?.textContent || '').replace(/\s+/g, ' ').trim();
}

/** Column "Falta"/"Como fazer" costumam trazer texto de puro preenchimento - sem valor numa resposta de chat. */
function semValor(texto) {
  const norm = normalizar(texto);
  return !texto || norm.startsWith('nada bloqueante') || norm === 'ja configurado' || norm.length < 4;
}

/** Reescreve um ".card" (grid3: Já temos / Falta / Como fazer) num paragrafo corrido, sem os rotulos de relatorio. */
function formatarCard(card) {
  const titulo = textoDe(card.querySelector('h3'));
  const colunas = [...card.querySelectorAll('.grid3 .col')];
  if (!titulo || !colunas.length) return null;

  const jaTemos = textoDe(colunas[0]?.querySelector('p'));
  const falta = textoDe(colunas[1]?.querySelector('p'));
  const comoFazer = textoDe(colunas[2]?.querySelector('p'));

  const partes = [`Sobre "${titulo}": ${jaTemos}`];
  if (!semValor(comoFazer)) partes.push(`Na prática: ${comoFazer}`);
  if (!semValor(falta)) partes.push(`Vale saber: ${falta}`);
  return { titulo, texto: partes.join(' ') };
}

/** Cards mais simples da seção de limitações (só h3 + um parágrafo). */
function formatarCardSimples(card) {
  const titulo = textoDe(card.querySelector('h3'));
  const paragrafo = textoDe(card.querySelector('p'));
  if (!titulo || !paragrafo) return null;
  return { titulo, texto: paragrafo };
}

/** Reescreve uma ".phase" do roadmap num paragrafo corrido. */
function formatarFase(fase) {
  const titulo = textoDe(fase.querySelector('h3'));
  const itens = [...fase.querySelectorAll('.ph-body li')].map(textoDe).filter(Boolean);
  if (!titulo || !itens.length) return null;
  return { titulo, texto: `A etapa "${titulo}" já foi concluída. ${itens.join(' ')}` };
}

/** Blocos "Automático" / "Continua manual" - já são uma lista curta, só junta com virgulas. */
function formatarFerramenta(bloco) {
  const titulo = textoDe(bloco.querySelector('h3'));
  const itens = [...bloco.querySelectorAll('.pc div')].map(textoDe).filter(Boolean);
  if (!titulo || !itens.length) return null;
  return { titulo, texto: `${titulo.replace(/^[^\wÀ-ÿ]+/, '')}: ${itens.join('; ')}.` };
}

/** Linhas do "Como usar" / "Próximos passos" - já são frases prontas, só remove o número/ícone do marcador. */
function formatarLinha(linha) {
  const paragrafo = linha.querySelector('p');
  if (!paragrafo) return null;
  const titulo = textoDe(paragrafo.querySelector('b')) || textoDe(paragrafo).split(' ').slice(0, 6).join(' ');
  const texto = textoDe(paragrafo);
  if (!texto) return null;
  return { titulo, texto };
}

let baseDoPlanoPromise = null;

/** Busca o proprio plano-trabalho.html (mesma origem) e monta os pedaços de conhecimento a partir dele. */
async function carregarBaseDoPlano() {
  if (baseDoPlanoPromise) return baseDoPlanoPromise;
  baseDoPlanoPromise = (async () => {
    try {
      const resp = await fetch('plano-trabalho.html', { cache: 'no-store' });
      const html = await resp.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const chunks = [];

      for (const card of doc.querySelectorAll('.card')) {
        const pedaco = card.querySelector('.grid3') ? formatarCard(card) : formatarCardSimples(card);
        if (pedaco) chunks.push(pedaco);
      }
      for (const fase of doc.querySelectorAll('.phase')) {
        const pedaco = formatarFase(fase);
        if (pedaco) chunks.push(pedaco);
      }
      for (const bloco of doc.querySelectorAll('.tool')) {
        const pedaco = formatarFerramenta(bloco);
        if (pedaco) chunks.push(pedaco);
      }
      for (const linha of doc.querySelectorAll('.next .row')) {
        const pedaco = formatarLinha(linha);
        // A linha do proprio chatbot lista varios topicos numa frase so' -
        // vira ima' de falso-positivo pra perguntas sobre qualquer um deles.
        if (pedaco && !pedaco.texto.includes('Chatbot de dúvidas sobre o app')) chunks.push(pedaco);
      }

      return chunks.map((c) => ({ ...c, chaves: tokens(`${c.titulo} ${c.texto}`) }));
    } catch {
      return [];
    }
  })();
  return baseDoPlanoPromise;
}

function pontuarPorTokens(perguntaTokens, chaves) {
  const chavesUnicas = new Set(chaves);
  let pontos = 0;
  for (const t of new Set(perguntaTokens)) {
    if (chavesUnicas.has(t)) pontos++;
  }
  return pontos;
}

async function responderPergunta(pergunta) {
  if (!normalizar(pergunta).trim()) return RESPOSTA_PADRAO;

  const perguntaTokens = tokens(pergunta);

  // Comparacao por palavras em comum (nao por trecho exato) - assim "alertas"
  // bate com "alerta", "resolvo os alertas" bate com "resolver alerta" etc.,
  // sem precisar prever cada variacao de plural/singular na hora de escrever
  // as chaves de cada pergunta.
  let melhorFaq = null;
  let pontosFaq = 0;
  for (const item of FAQ) {
    const chaveTokens = tokens(item.chaves.join(' '));
    const pontos = pontuarPorTokens(perguntaTokens, chaveTokens);
    if (pontos > pontosFaq) {
      pontosFaq = pontos;
      melhorFaq = item;
    }
  }
  if (pontosFaq >= 2) return melhorFaq.resposta;

  const base = await carregarBaseDoPlano();
  const minimoNecessario = Math.max(2, Math.ceil(new Set(perguntaTokens).size * 0.5));
  let melhorChunk = null;
  let pontosChunk = 0;
  for (const chunk of base) {
    const pontos = pontuarPorTokens(perguntaTokens, chunk.chaves);
    if (pontos > pontosChunk) {
      pontosChunk = pontos;
      melhorChunk = chunk;
    }
  }

  // Exige pelo menos 2 palavras em comum E metade das palavras da pergunta -
  // um único termo genérico batendo por acaso (ex.: "tempo") não deve gerar
  // uma resposta inteira sobre outro assunto.
  if (pontosChunk >= minimoNecessario) return melhorChunk.texto;
  if (pontosFaq >= 1) return melhorFaq.resposta;
  return RESPOSTA_PADRAO;
}

function mensagem(texto, autor) {
  return el('div', { class: `chatbot-msg ${autor}` }, [texto]);
}

/** Perguntas prontas pra clicar, sem precisar digitar - cobrem os casos mais comuns. */
const SUGESTOES = [
  'Como funciona o Kanban?',
  'Como resolvo os alertas?',
  'O checklist muda por cliente?',
  'Como crio a pasta de um colaborador?',
  'Como recebo alertas por e-mail?',
  'Erro ao entrar (login)',
];

function montarPainel() {
  const corpo = el('div', { class: 'chatbot-corpo', id: 'chatbotCorpo' }, [
    mensagem('Oi! Posso ajudar com dúvidas sobre como usar o app de Auditoria de Integração — login, Kanban, salvar, alertas, checklist por cliente, criar pasta de colaborador, filtros, exportar planilha, e-mail de alerta, instalar o app... Pode perguntar, ou clicar numa das sugestões abaixo.', 'bot'),
    el('div', { class: 'chatbot-sugestoes' }, SUGESTOES.map((s) =>
      el('button', { class: 'chatbot-chip', type: 'button', texto: s, onclick: () => enviarPergunta(s) })
    )),
  ]);

  const input = el('input', { type: 'text', id: 'chatbotInput', placeholder: 'Digite sua dúvida…' });

  async function enviarPergunta(pergunta) {
    if (!pergunta.trim()) return;
    corpo.append(mensagem(pergunta, 'usuario'));
    input.value = '';
    corpo.scrollTop = corpo.scrollHeight;
    const resposta = await responderPergunta(pergunta);
    corpo.append(mensagem(resposta, 'bot'));
    corpo.scrollTop = corpo.scrollHeight;
  }

  const form = el('form', { class: 'chatbot-form', id: 'chatbotForm' }, [
    input,
    el('button', { class: 'btn-primario', type: 'submit', texto: 'Enviar' }),
  ]);

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    enviarPergunta(input.value.trim());
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

// Icone "conversa" da iconografia oficial da Angulo Social (Fill cinza 21x21),
// recolorido branco - usar essa iconografia daqui pra frente pra icones novos.
const ICONE_CONVERSA = '<svg viewBox="0 0 21 21" width="22" height="22" aria-hidden="true"><path fill="#fff" d="M5.46,10.76c0,.9.32,1.66.98,2.3.64.66,1.4.98,2.3.98h4.48c0,1.3-.78,2.28-2.06,2.28h-5.12l-1.98,2.1c-.38.4-.94.14-.94-.4v-1.54c-1.3-.16-2.2-.94-2.2-2.22v-4.98c0-1.14.92-2.08,2.06-2.08h2.48v3.56ZM17.76,2.94c1.28,0,2.32,1.04,2.32,2.32v5.5c0,1.4-.82,2.2-2.44,2.42v1.82c0,.54-.56.8-.94.42l-2.52-2.34h-5.44c-.62,0-1.16-.22-1.62-.68-.46-.46-.7-1-.7-1.64v-5.5c0-.64.24-1.18.7-1.64.46-.46,1-.68,1.62-.68h9.02Z"/></svg>';

export function iniciar() {
  const botao = el('button', { class: 'btn-chatbot', id: 'btnChatbot', 'aria-label': 'Dúvidas sobre o app', html: ICONE_CONVERSA });
  const painel = montarPainel();

  document.body.append(botao, painel);
  carregarBaseDoPlano(); // prepara em segundo plano, pra' primeira pergunta nao esperar o fetch

  botao.addEventListener('click', () => {
    painel.hidden = !painel.hidden;
    if (!painel.hidden) document.getElementById('chatbotInput')?.focus();
  });
  painel.querySelector('#btnFecharChatbot').addEventListener('click', () => {
    painel.hidden = true;
  });
}
