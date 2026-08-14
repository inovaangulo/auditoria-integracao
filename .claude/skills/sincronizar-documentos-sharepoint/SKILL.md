---
name: sincronizar-documentos-sharepoint
description: Audita as pastas de documentos de colaboradores no SharePoint (site "admin", pasta TESTES_IA_ADM) contra a planilha de auditoria da Ângulo Social, e atualiza o status dos documentos encontrados. Use quando precisar rodar/testar/ajustar essa sincronização, entender o relatório que ela gera, ou adicionar um novo tipo de documento.
---

# Sincronizar documentos com o SharePoint — Auditoria de Integração

*Criado por Sara Cantão — Ângulo Social.*

Audita as pastas de colaboradores no SharePoint contra a planilha
`Painel_Controle_Integracao_Trivia_Tabela.xlsx` (a mesma que [o app
web](../../) usa). **A pasta é o gatilho**: quando uma profissional da ADM
cria a pasta de um colaborador novo, o script cadastra a linha
correspondente na planilha sozinho — a planilha não precisa (e não deve) ter
os dados de ninguém antes de a pasta existir. Depois disso, o script marca
como "Recebido" cada documento cujo arquivo for encontrado com o nome certo.

Faz parte do mesmo projeto do app web — **não é uma skill separada por
acaso**: reaproveita `schema.js` e `regras.js` do app, então o checklist de
documentos e as regras de negócio são exatamente as mesmas dos dois lugares.

## Quando usar

- Testar a sincronização depois de mudar o script ou a convenção de nomes
- Entender por que um colaborador não está aparecendo como "documentos
  completos" mesmo com o arquivo no SharePoint
- Entender por que um colaborador novo não apareceu no Kanban
- Adicionar um novo tipo de documento (TIPODOC) ao checklist
- Diagnosticar uma pasta que não está sendo reconhecida

## Convenção de nomes (decidida pela Sara em 12/08/2026)

```
pasta:   {CPF ou CNPJ}_{Nome completo}
arquivo: {CPF ou CNPJ}_{Nome completo}_{TIPODOC}.ext
```

- CPF/CNPJ mantém a pontuação (pontos, hífen) — ajuda a diferenciar CPF de
  CNPJ de cara. A única troca é a barra do CNPJ (`/`) por hífen (`-`), porque
  SharePoint/OneDrive proíbem barra em nome de pasta ou arquivo.
- Espaços no nome viram underscore.
- TIPODOC é o **último trecho do nome do arquivo, antes da extensão**. A
  lista de códigos aceitos está em `abrevs` de cada item de `DOCUMENTOS`, em
  [`js/schema.js`](../../js/schema.js).

Exemplo real (dados de teste, Trivia): `111.222.333-44_Ana_Paula_Ribeiro_ASO.pdf`
dentro da pasta `111.222.333-44_Ana_Paula_Ribeiro`.

## A pasta é o gatilho — a planilha nasce vazia e cresce sozinha

Mudança de design em 13/08/2026 (pedido da Sara): a planilha **começa sem
nenhum colaborador**. É a profissional da ADM criando a pasta que sinaliza
"chegou alguém novo". Para cada pasta encontrada em TESTES_IA_ADM, o script
tenta extrair o CPF/CNPJ e o nome direto do nome da pasta, e decide:

- **Colaborador novo**: nenhuma linha da planilha tem esse CPF/CNPJ ainda —
  o script **cria a linha sozinho** (Nome completo, CPF ou CNPJ, Tipo
  inferido pelo formato do documento — 11 dígitos = CLT, 14 = PJ — e Status
  atual = "Documento em elaboração", a primeira coluna do Kanban).
- **Planilha atualizada pela pasta**: já existe uma linha com esse CPF/CNPJ,
  mas o nome completo (ou a pontuação do CPF/CNPJ) na pasta é diferente do
  que está na planilha — o script **atualiza a planilha** para acompanhar a
  pasta. **A pasta nunca é renomeada** (mudança de 13/08/2026): se a
  profissional da ADM corrigir a pasta depois — ex.: adicionar um sobrenome
  que faltava — a planilha segue essa correção, nunca o contrário. Antes
  disso o script fazia o inverso (renomeava a pasta para bater com a
  planilha), o que desfazia qualquer correção feita depois da criação.
- **Pasta não reconhecida**: o nome da pasta não tem 11 nem 14 dígitos onde
  deveria ter o CPF/CNPJ — o script **não cria nada**, só reporta. Confiar
  num formato errado poderia cadastrar um colaborador com dado inventado.
- **Colaborador sem pasta**: já existe uma linha na planilha, mas nenhuma
  pasta correspondente foi encontrada (raro nesse fluxo — só acontece se
  alguém apagar a pasta depois de criada).

Depois de resolver o nome, o script lê os documentos de dentro da pasta e
marca "Recebido" na planilha para cada um que reconhecer pelo TIPODOC. O log
não mostra o nome exato de cada arquivo (só a contagem e os TIPODOC
reconhecidos) — ver seção de privacidade abaixo.

## ⚠️ Cuidado com dado real enquanto o repositório for público

O log de cada execução do GitHub Actions é **público**, porque o
repositório é público (exigência do GitHub Pages gratuito). Isso já causou
uma exposição real em 13/08/2026: uma pasta de uma colaboradora de verdade
foi processada em TESTES_IA_ADM, e o nome completo dela apareceu no log
antes desta skill reduzir o que é impresso.

**Enquanto isso não for resolvido definitivamente** (mover este script para
um repositório privado — ver Pendências), trate TESTES_IA_ADM como uma área
só de teste com dados fictícios. Se uma pasta real acabar entrando ali por
engano:
1. Mova a pasta para fora de TESTES_IA_ADM imediatamente (antes da próxima
   execução agendada).
2. Apague a execução do GitHub Actions que a processou: Actions → a
   execução → "..." → **Delete workflow run**.

## Como rodar

**Roda sozinho** de 3 em 3 horas, em horário comercial (8h, 11h, 14h e 17h,
horário de Brasília), de segunda a sexta — não precisa clicar em nada no dia
a dia. O gatilho é o `schedule:` em
[`.github/workflows/sincronizar-documentos.yml`](../../.github/workflows/sincronizar-documentos.yml)
(cron do GitHub Actions é sempre em UTC, por isso o arquivo tem `11,14,17,20`).

Para mudar o horário ou a frequência, edite essa linha de cron e publique —
não precisa de nada além disso. Duas particularidades do agendamento do
GitHub Actions vale saber:
- O horário não é exato ao minuto — pode atrasar alguns minutos em períodos
  de pico do GitHub.
- Se o repositório ficar **60 dias sem nenhum commit**, o GitHub desativa o
  agendamento automaticamente (some tipo de proteção contra repositório
  abandonado). Qualquer commit novo reativa.

Também dá para rodar manualmente quando quiser (útil para testar uma mudança
sem esperar o próximo horário):

1. `https://github.com/inovaangulo/auditoria-integracao/actions`
2. Clique em **"Sincronizar documentos dos colaboradores"** no menu à esquerda
3. Botão **"Run workflow"** (não confundir com "Re-run jobs" de uma execução
   antiga — isso reexecuta o código de quando aquela execução foi disparada,
   não o código atual do branch `main`)
4. Depois de terminar (~15-20s), clique na execução → **"Run node
   scripts/sincronizar-documentos.mjs"** para ver o log

O log mostra, por colaborador com pasta encontrada, os arquivos e o TIPODOC
detectado de cada um, e termina com um resumo: quantos colaboradores novos
foram cadastrados, quantas pastas já conferiam, quantos nomes foram
corrigidos, quantas pastas não foram reconhecidas, quantos colaboradores
ficaram sem pasta, e quantos foram atualizados na planilha.

## Não precisa de senha nenhuma

A autenticação é via **credencial federada** (Entra ID ↔ GitHub Actions
OIDC) — não existe segredo/senha armazenado em lugar nenhum. Detalhes e os
IDs envolvidos (clientId, tenantId, IDs dos dois sites do SharePoint) estão
documentados nos comentários de [`js/config.js`](../../js/config.js) e no
início de
[`scripts/sincronizar-documentos.mjs`](../../scripts/sincronizar-documentos.mjs).

Se precisar reconfigurar do zero (outro tenant, outro app registration), o
caminho é: registrar o app no Microsoft Entra ID → permissão de aplicativo
`Sites.Selected` com consentimento do administrador → aba "Credenciais
federadas" → cenário GitHub Actions (branch `main`, repo
`inovaangulo/auditoria-integracao`) → conceder acesso `write` a cada site
específico via `POST /sites/{id}/permissions` no Graph Explorer (não é
possível pelo portal do Azure — só via chamada direta ao Graph).

## Adicionar um novo tipo de documento (TIPODOC)

Edite `DOCUMENTOS` em [`js/schema.js`](../../js/schema.js) — adicione (ou
edite) o campo `abrevs` do documento correspondente. Ex.: para aceitar tanto
`_VACINA` quanto `_CARTAOVACINA` como o mesmo documento:

```js
{ campo: 'Doc: Cartão de Vacina', label: 'Cartão de Vacina', vinculo: 'todos',
  abrevs: ['VACINA', 'CARTAOVACINA'] },
```

Isso atualiza automaticamente `CAMPOS_POR_ABREV`, usado tanto pelo script
quanto (se um dia precisar) pelo app web.

## Diagnosticando "0 atualizado" quando devia ter atualizado

Causas mais comuns, na ordem em que vale checar:

1. **O arquivo foi subido depois da última execução.** Rode de novo.
2. **Nome do arquivo não bate exatamente.** Abra o log — ele mostra o TIPODOC
   detectado de cada arquivo (`arquivo.pdf -> TIPO`). Se aparecer
   `(sem TIPODOC)`, o último trecho antes da extensão não bateu com nenhum
   `abrevs` conhecido.
3. **O campo já estava "Recebido" antes.** O script só grava quando algo
   muda; se já estava certo, não há nada para atualizar (não é erro).
4. **Clicou em "Re-run" em vez de "Run workflow".** Reexecuta o código de
   quando aquela execução foi criada, não o `main` atual — confira o hash do
   commit no topo da página da execução.

## Pendências

- **Mover o script para um repositório privado.** É a correção definitiva
  para o log público — enquanto isso não acontece, o paliativo (log sem
  nome de arquivo) reduz mas não elimina o risco. Precisa: criar o
  repositório privado, mover `scripts/`, `.github/workflows/` e este
  `.claude/skills/` para lá, e reconfigurar a credencial federada no Entra
  ID para confiar no novo repositório (branch, org/repo diferentes).
- Histórico de auditoria (quem rodou quando, o que mudou) não é gravado em
  lugar nenhum além do log do próprio GitHub Actions — se precisar de
  retenção mais longa, seria um próximo passo.
