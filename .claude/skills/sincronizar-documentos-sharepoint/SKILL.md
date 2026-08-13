---
name: sincronizar-documentos-sharepoint
description: Audita as pastas de documentos de colaboradores no SharePoint (site "admin", pasta TESTES_IA_ADM) contra a planilha de auditoria da Ângulo Social, e atualiza o status dos documentos encontrados. Use quando precisar rodar/testar/ajustar essa sincronização, entender o relatório que ela gera, ou adicionar um novo tipo de documento.
---

# Sincronizar documentos com o SharePoint — Auditoria de Integração

Audita as pastas de colaboradores no SharePoint contra a planilha
`Painel_Controle_Integracao_Trivia_Tabela.xlsx` (a mesma que [o app
web](../../) usa) e marca como "Recebido" cada documento cujo arquivo for
encontrado com o nome certo.

Faz parte do mesmo projeto do app web — **não é uma skill separada por
acaso**: reaproveita `schema.js` e `regras.js` do app, então o checklist de
documentos e as regras de negócio são exatamente as mesmas dos dois lugares.

## Quando usar

- Testar a sincronização depois de mudar o script ou a convenção de nomes
- Entender por que um colaborador não está aparecendo como "documentos
  completos" mesmo com o arquivo no SharePoint
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

## As pastas são criadas pelas profissionais da ADM, não pelo script

Mudança de design em 12/08/2026: o script **não cria mais pastas
automaticamente**. A profissional da ADM cria a pasta do colaborador e sobe
os documentos; o script confere e corrige o nome se precisar:

- **Faltando**: nenhuma pasta com aquele CPF/CNPJ foi encontrada — a pessoa
  ainda não criou.
- **Nome corrigido** (13/08/2026): achou uma pasta cujo CPF/CNPJ bate com um
  colaborador da planilha, mas o nome completo estava diferente do padrão
  (erro de digitação, abreviação, etc.) — o script **renomeia a pasta
  automaticamente** para o padrão certo. É seguro fazer isso porque o
  CPF/CNPJ já identificou com certeza a quem a pasta pertence; só o texto do
  nome estava errado.
- **Pasta sem colaborador correspondente**: existe uma pasta cujo CPF/CNPJ
  não bate com nenhuma linha da planilha (pessoa não cadastrada, ou erro no
  CPF/CNPJ digitado na pasta). Essa **não é tocada automaticamente** — só
  reportada, porque sem CPF/CNPJ batendo não há como saber com segurança de
  quem é.

Depois de conferir/corrigir o nome, o script lê os documentos de dentro e
marca "Recebido" na planilha para cada um que reconhecer pelo TIPODOC.

## Como rodar

Por enquanto só manualmente (Parte C — agendamento automático — ainda não
foi implementada):

1. `https://github.com/inovaangulo/auditoria-integracao/actions`
2. Clique em **"Sincronizar documentos dos colaboradores"** no menu à esquerda
3. Botão **"Run workflow"** (não confundir com "Re-run jobs" de uma execução
   antiga — isso reexecuta o código de quando aquela execução foi disparada,
   não o código atual do branch `main`)
4. Depois de terminar (~15-20s), clique na execução → **"Run node
   scripts/sincronizar-documentos.mjs"** para ver o log

O log mostra, por colaborador com pasta encontrada, os arquivos e o TIPODOC
detectado de cada um, e termina com um resumo:
`X pasta(s) conferindo, Y com nome diferente, Z sem pasta, W atualizado(s)`.

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

- **Parte C (agendamento automático)**: por enquanto só roda quando alguém
  clica em "Run workflow". Adicionar um gatilho `schedule:` (cron) ao
  workflow quando o teste manual estiver validado.
- Histórico de auditoria (quem rodou quando, o que mudou) não é gravado em
  lugar nenhum além do log do próprio GitHub Actions — se precisar de
  retenção mais longa, seria um próximo passo.
