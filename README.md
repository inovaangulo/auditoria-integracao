# Auditoria de Integração — Ângulo Social

Aplicação web para auditar a documentação de integração de colaboradores CLT e PJ.
Substitui o controle feito só na planilha, mantendo a **mesma planilha como fonte
da verdade**: o app lê e grava nela, e quem abrir o arquivo no Excel vê o mesmo.

Kanban por etapa, ficha do colaborador com o checklist de documentos, dashboard de
indicadores e visão em tabela. Sem instalação — abre no navegador.

---

## ⚠️ Antes de qualquer coisa: dado pessoal não entra neste repositório

A base tem **CPF, CNPJ e telefone** — dado pessoal protegido pela LGPD. O GitHub
Pages gratuito exige repositório **público**.

**Nunca faça commit da planilha real nem de exportações dela.** O `.gitignore` já
bloqueia `.xlsx`, mas a responsabilidade final é de quem versiona. Os dados reais
ficam no SharePoint, atrás do login da Microsoft — nunca no repositório.

O arquivo `exemplo/dados-exemplo.json` contém **dados fictícios** (nomes e CPFs
inventados), usado só para demonstrar a tela.

---

## Os dois modos de operação

O app decide o modo pelo `clientId` em `js/config.js`.

| | Modo local (padrão) | Modo SharePoint |
|---|---|---|
| Quando | `clientId` vazio | `clientId` preenchido |
| Onde ficam os dados | Só no navegador de quem abriu | Na planilha do SharePoint |
| Entrada de dados | Botão "Importar planilha" | Login com a conta @angulosocial.com |
| Vários usuários ao mesmo tempo | **Não** | Sim |
| Histórico de alterações | Por navegador | **Compartilhado** — aba "Histórico" na própria planilha |

O modo local serve para **validar a tela antes de mexer no Azure**. Ele repete a
limitação do Excel compartilhado de hoje — por isso o app exibe uma faixa de aviso
permanente enquanto estiver nele.

---

## Como usar agora (modo local)

1. Abra o `index.html` — pelo GitHub Pages ou por um servidor local.
2. Clique em **Importar planilha** e escolha `Painel_Controle_Integracao_Trivia_Tabela.xlsx`.
3. Trabalhe no Kanban: arraste cartões entre etapas, clique num cartão para abrir a ficha.
4. Ao terminar, clique em **Exportar planilha** e salve por cima da original no SharePoint.

> Os módulos JavaScript não funcionam abrindo o arquivo direto do disco (`file://`).
> Para rodar local, use um servidor:
>
> ```bash
> python -m http.server 8123 --directory AuditoriaIntegracaoApp
> ```
>
> e acesse `http://localhost:8123`.

---

## Ligar na planilha do SharePoint

Isso elimina o importar/exportar: o app passa a gravar direto no arquivo.

### 1. Registrar o aplicativo no Microsoft Entra ID (Azure AD)

Em [portal.azure.com](https://portal.azure.com) → **Microsoft Entra ID** →
**Registros de aplicativo** → **Novo registro**:

| Campo | Valor |
|---|---|
| Nome | `Auditoria de Integração — Ângulo Social` |
| Tipos de conta com suporte | Apenas contas neste diretório organizacional |
| URI de Redirecionamento | Plataforma **SPA** → `https://SEU-USUARIO.github.io/auditoria-integracao/` |

Depois de registrar, em **Autenticação**, adicione um segundo URI de SPA para
testar localmente: `http://localhost:8123`.

### 2. Conceder a permissão de leitura/escrita

Em **Permissões de API** → **Adicionar uma permissão** → **Microsoft Graph** →
**Permissões delegadas** → marque `Files.ReadWrite.All` e `User.Read` → **Adicionar**.

*Delegada* significa que o app só enxerga o que a pessoa logada já poderia abrir no
SharePoint — ele não ganha acesso próprio a nada.

Se aparecer o aviso de que o consentimento do administrador é necessário, clique em
**Conceder consentimento do administrador**. Se você não tiver esse botão, peça ao
administrador do Microsoft 365 — é uma aprovação única.

### 3. Colar o ID no app

Copie o **ID do aplicativo (cliente)** da página de visão geral do registro e cole
em `js/config.js`:

```js
clientId: 'cole-o-id-aqui',
```

Pronto. Ao recarregar, o botão **Entrar com conta Ângulo** aparece e o app passa a
ler e gravar na planilha.

> O `clientId` é um identificador público, não uma senha — pode ir para o
> repositório sem risco. **Nunca** coloque um *client secret* neste arquivo.

### Se der erro ao conectar

| Mensagem | Causa provável |
|---|---|
| Sem permissão para abrir a planilha | Consentimento do administrador pendente, ou sua conta não tem acesso à pasta no SharePoint |
| Planilha não encontrada | O arquivo foi movido/excluído — confira `driveId` e `itemId` em `js/config.js` |
| Planilha bloqueada para edição | Alguém está com o arquivo aberto no Excel desktop — feche para liberar |

---

## Publicar no GitHub Pages

```bash
git remote add origin https://github.com/SEU-USUARIO/auditoria-integracao.git
git push -u origin main
```

No repositório: **Settings** → **Pages** → *Source*: `Deploy from a branch` →
branch `main`, pasta `/ (root)` → **Save**.

Em ~1 minuto o app fica em `https://SEU-USUARIO.github.io/auditoria-integracao/`.

Esse é o endereço que precisa estar cadastrado como URI de redirecionamento SPA no
Azure — se não bater exatamente (inclusive a barra final), o login falha.

---

## Estrutura

```
index.html              Página única — a estrutura fixa da tela
css/styles.css          Identidade visual Ângulo Social
js/
  config.js             clientId do Azure e localização da planilha  ← o que você edita
  schema.js             As 46 colunas, o checklist CLT/PJ, as etapas do Kanban
  regras.js             Prazos, alertas e "documentos completos?"
  ui.js                 Utilitários de interface
  app.js                Liga os controles da página às telas
  dados/
    index.js            Estado central, filtros e histórico
    planilha.js         Conversão linha ↔ registro, importar/exportar .xlsx
    local.js            Fonte: navegador
    graph.js            Fonte: SharePoint via Microsoft Graph
  telas/
    kanban.js  detalhe.js  dashboard.js  lista.js
exemplo/
  dados-exemplo.json    Dados fictícios para demonstração
```

A rotina de sincronização automática (script, workflow e skill) mora num
repositório separado e privado — ver a seção abaixo.

**Mudou uma coluna na planilha?** Atualize `js/schema.js` na mesma posição — a
ordem de `COLUNAS` precisa espelhar a planilha de A até AT, porque é por posição
que a linha vira registro e volta.

**Mudou um prazo?** `PARAMETROS` em `js/schema.js`.

---

## Sincronização automática com pastas do SharePoint

A pasta de documentos no SharePoint (site "admin", biblioteca TESTES_IA_ADM)
é o ponto de entrada de um colaborador novo: quando a profissional da ADM
cria a pasta no padrão `CPF/CNPJ_Nome completo`, uma rotina cadastra a linha
correspondente na planilha sozinha — **a planilha não precisa ter ninguém
cadastrado antes**. Os documentos entram no padrão
`CPF/CNPJ_Nome completo_TIPODOC.ext` (ex.:
`111.222.333-44_Ana_Paula_Ribeiro_ASO.pdf`).

**Essa rotina mora num repositório separado e privado:**
[`inovaangulo/auditoria-integracao-automacao`](https://github.com/inovaangulo/auditoria-integracao-automacao).
Ela precisa ler nomes de arquivo que podem ter dado pessoal embutido, e o log
de execução do GitHub Actions é sempre público num repositório público — por
isso ficou separada deste (que continua público, sem nenhum dado pessoal,
só para o GitHub Pages funcionar de graça). `js/schema.js`, `js/regras.js` e
`js/dados/planilha.js` continuam aqui, porque não têm segredo e o app web
também precisa deles — a rotina só importa esses arquivos por cima.

Guia completo (convenção de nomes, como rodar, como interpretar o relatório,
como adicionar um novo tipo de documento) está no outro repositório, em
`.claude/skills/sincronizar-documentos-sharepoint/SKILL.md`.

---

## Regras implementadas

- **Documentos completos?** — todos os obrigatórios do vínculo em `Recebido` ou
  `Não se aplica`. CNH é condicional e não bloqueia.
- **Cobrança de assinatura** — dias corridos desde o envio; zera quando aprovado.
- **Confirmação da empresa (PJ)** — dias corridos desde o cadastro no Wehandle.
- **Prazo da análise Wehandle** — em dias **úteis**, descontando sábado, domingo
  e feriados nacionais (fixos e móveis).
- **Consistência** — aponta "aprovado com documento pendente" e "enviado para
  assinatura sem documentação completa". É aviso, não trava: quem decide é o ADM.
- **Data de entrada** — não é uma coluna da planilha. É a entrada mais antiga do
  histórico de cada colaborador (normalmente "Cadastro", gravada pela sincronização
  automática ao criar a linha a partir da pasta). Usada pela coluna "Entrada" da
  Lista e pelo rótulo de período do Dashboard. Colaborador cadastrado antes do
  histórico existir aparece como "sem data".

Os valores de prazo vêm da aba *Parâmetros* da planilha e estão em `js/schema.js`.

---

## Limitações conhecidas

- **Feriados municipais não entram no cálculo de dias úteis.** Só os nacionais
  (fixos e móveis, calculados a partir da Páscoa) — municipais variam por
  contrato/cidade e exigiriam um calendário à parte.
- **Sem edição simultânea da mesma linha.** Se duas pessoas abrirem o mesmo
  colaborador, a última que salvar sobrescreve a outra. Com o volume atual isso é
  improvável, mas cresce com a equipe.
- **O Excel desktop bloqueia a gravação.** Com o arquivo aberto no Excel, o app não
  consegue escrever até fecharem.
- **Depende de CDN.** As bibliotecas de planilha e de login carregam da internet;
  sem rede externa, importar/exportar e o login não funcionam.
