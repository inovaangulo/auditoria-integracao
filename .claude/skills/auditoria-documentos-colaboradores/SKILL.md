---
name: auditoria-documentos-colaboradores
description: Audita pastas de documentos de integração de colaboradores (CLT e PJ), compara com o checklist padrão de integração, verifica vencimentos, confere se o conteúdo dos documentos realmente pertence ao colaborador daquela pasta, e sinaliza os documentos que só são exigidos por contratos específicos. Produz uma planilha Excel e um quadro Kanban em HTML.
---

# Auditoria de Documentos de Integração de Colaboradores

*Criado por Sara Cantão — Ângulo Social.*

Audita pastas de documentos de integração de colaboradores (CLT e PJ), compara com o checklist padrão de integração, verifica vencimentos, confere se o conteúdo dos documentos realmente pertence ao colaborador daquela pasta, e sinaliza os documentos que só são exigidos por contratos específicos. Produz uma planilha Excel e um quadro Kanban em HTML (com badges clicáveis e checklist dos faltantes).

**Nota (13/08/2026):** esta skill audita pastas **locais** (uma pasta base com uma subpasta por colaborador, no computador de quem roda). É diferente da
[`sincronizar-documentos-sharepoint`](../sincronizar-documentos-sharepoint/SKILL.md), que audita pastas **no SharePoint** diretamente e atualiza a planilha
`Painel_Controle_Integracao_Trivia_Tabela.xlsx` sem passo manual nenhum. As duas reaproveitam o mesmo tipo de checklist, mas são ferramentas distintas —
esta aqui serve para uma conferência pontual a partir de uma pasta que alguém baixou; a outra é a rotina contínua do dia a dia da Ângulo Social.

## Quando usar

- Conferir/auditar se a documentação de integração de um ou mais colaboradores está completa
- Verificar pendências para liberar colaborador em contrato/obra
- Saber quais documentos estão vencidos ou vencendo (ex.: ASO)
- Saber se algum documento pode estar na pasta errada (nome não bate)
- Gerar relatório ou quadro de status da documentação de colaboradores

## Identidade visual (padrão fixo, não é opcional)

Todo relatório gerado por esta skill — Excel e Kanban HTML — segue a identidade
visual da Ângulo Social (mesma paleta do template "Plano de Trabalho Ângulo"):
faixa/cabeçalho vermelho `#C1272D`, tipografia Segoe UI, status em verde
`#2E7D5B` (completo), âmbar `#B7860B` (atenção/vencendo), vermelho suave
`#FBECEB`/vermelho escuro `#8F1C20` (incompleto/vencido/divergência de nome) e
cinza `#6B7280` (indefinido/a verificar). As cores genéricas do Excel
(verde/amarelo/vermelho "de fábrica") não devem ser usadas — os scripts abaixo
já saem prontos nessa paleta; não reverta para as cores padrão a menos que o
usuário peça explicitamente outra identidade.

## Formato esperado da pasta

Uma **pasta base** com uma **subpasta por colaborador** (nome da subpasta = nome
do colaborador; esse nome é usado para exibir e para conferir se aparece no
conteúdo dos documentos). Os documentos ficam dentro da subpasta.

Se o usuário apontar para a pasta de **um único colaborador**, crie uma pasta
temporária, coloque um link/cópia dessa pasta dentro dela e rode a análise nessa
pasta temporária — o script sempre espera uma pasta-mãe com subpastas.

## Detecção automática de vínculo (CLT vs PJ)

O script decide o vínculo pelos arquivos presentes, porque a exigência documental
muda bastante entre os dois:

- **PJ** se encontrar CCMEI/MEI, contrato de prestação de serviço, declaração de
  inexistência de vínculo, ou APR. Esses documentos só existem em dossiê PJ, então
  têm precedência.
- **CLT** se, na ausência dos sinais de PJ, encontrar CTPS, carteira de trabalho,
  eSocial, ficha de registro ou contrato de experiência.
- **Indefinido** se não achar nenhum sinal. Nesse caso o script cobra apenas o que
  é comum aos dois vínculos e marca o colaborador como `vinculo_indefinido`, em vez
  de arriscar cobrar documento de PJ de um CLT (ou vice-versa) e poluir o relatório
  com pendências falsas. Peça ao usuário para confirmar o vínculo nesses casos.

## Checklist de integração

**Comuns a todos os vínculos:**

| Documento | Identificado por | Observação |
|---|---|---|
| Ordem de Serviço | "ordem serviço", "OS" | — |
| Ficha de Entrega de EPI | "ficha epi", "EPI" | — |
| Treinamento NR-18 | "nr18" | Certificado costuma ser imagem — validade conferida manualmente |
| Treinamento NR-06 | "nr06"/"nr 6" | Idem. **Dispensado nos contratos Motiva** |
| RG | "rg", "identidade" | — |
| CNH (quando aplicável) | "cnh" | Condicional: só exigida se a função pedir — não derruba o status |
| ASO | "aso" | Validade de 1 ano a partir da data do exame |
| Foto | "foto" | — |

**Somente CLT:** Cadastro no eSocial, CTPS.

**Somente PJ:** Contrato de Prestação de Serviço, CCMEI, APR (Análise Preliminar
de Risco), Declaração de Atendimento às Leis Trabalhistas, Declaração de
Inexistência de Vínculo Empregatício, Declaração de Inexistência de Riscos
(emitida pelo PJ), Relação dos Alojamentos.

**Exigidos apenas em contratos específicos** (por padrão entram como **aviso
informativo**, não como pendência — vire obrigatório passando `--contrato`):

| Documento | Contratos que exigem |
|---|---|
| Cartão de Vacina | Motiva Pantanal, Alcoa, Via Brasil |
| Tipo Sanguíneo + Fator RH | Motiva Pantanal |
| Apólice de Seguro | Motiva Pantanal |
| Declaração de Alojamento | Motiva Pantanal |
| Declaração de Riscos | Ecorodovias (Ecovias do Araguaia, Ecovias Capixaba, EcoRioMinas) |
| Declaração de Não Obrigatoriedade de NRs | EPR, Nova 381, Nova 364 |
| Declaração de N3 – Permissão de Trabalho | Nova 381 |

Contratos conhecidos: NOVA 381, NOVA 364, COPEL, ENGETRENS, EPR, ROTA VERDE,
WAY262, MOTIVAS, MOTIVA PANTANAL, ECOVIAS DO ARAGUAIA, ECOVIAS CAPIXABA,
ECORIOMINAS, AXIA, BRASIL PCH, ALCOA, ELOVIAS, VIA BRASIL, VIA ARAUCARIA.

Se o usuário indicar que a lista mudou (novo contrato, documento adicional,
outro cliente), ajuste `CHECKLIST` / `DOCS_POR_CONTRATO` no script antes de rodar
— não force o padrão quando o usuário já disse que é diferente.

## Verificação de nome (documento na pasta errada)

Além de checar se o arquivo existe, o script extrai o texto do PDF e procura os
termos do nome da pasta (ex. pasta "Joao_Pedro_Silva" → "joao", "pedro", "silva").
Se a maioria não aparecer, marca `nome_confere: false` — sinal de que o arquivo
pertence a outro colaborador ou foi salvo na pasta errada.

A checagem é pulada quando o PDF não tem texto extraível (escaneado/assinado como
imagem) e para tipos que por natureza não trazem o nome legível (RG, CNH,
certificados NR, APR, relação de alojamentos). Checar ali só geraria falso alarme.

## Regras de status

Status de validade por documento: `ok`, `vencendo` (até 30 dias), `vencido`,
`nao_verificavel` (documento presente mas sem data extraível — comum em PDFs
escaneados).

Status geral do colaborador, do pior para o melhor:

1. `vinculo_indefinido` — não foi possível dizer se é CLT ou PJ; confirme antes de concluir
2. `incompleto` — falta documento obrigatório
3. `divergencia_nome` — documento obrigatório cujo nome não bate com a pasta (possível arquivo trocado)
4. `vencido` — documento com validade expirada
5. `atencao` — documento vencendo em breve
6. `completo` — tudo presente e em dia

No Kanban há ainda uma coluna **Revisados**: ela começa vazia e é preenchida no
navegador quando o usuário marca todos os itens do checklist de faltantes de um
colaborador (o card sai de "Incompleto" e vai para "Revisados"). É um estado de
conferência manual do usuário, não um status calculado pelo script.

## Como executar

1. Crie uma pasta de trabalho temporária e salve os três scripts abaixo nela.
2. Rode a análise (use a data real do sistema, nunca uma data fixa):

   ```bash
   python3 analisar_colaboradores.py "<pasta_base>" --data-ref $(date +%Y-%m-%d) > resultado.json
   ```

   Se o usuário informar o contrato, passe `--contrato "MOTIVA PANTANAL"` — isso
   torna obrigatórios os documentos daquele contrato e dispensa a NR-06 nos
   contratos Motiva.

3. Gere as saídas:

   ```bash
   python3 gerar_excel.py resultado.json auditoria_integracao.xlsx
   python3 gerar_kanban.py resultado.json auditoria_integracao.html
   ```

   No Kanban, os badges de cada card ("N faltando", "N a verificar", "N vencido(s)"
   etc.) são **clicáveis** e abrem/fecham a lista correspondente (recolhida por
   padrão). O badge "faltando" abre um **checklist de caixas de marcar**, com
   contador "X/N coletados". O que for marcado fica salvo no navegador
   (localStorage) e, quando o colaborador tem todas as caixas marcadas, o card é
   movido automaticamente da coluna de origem para **Revisados**.

4. **Copie os arquivos finais para a pasta do usuário conectada ao Cowork, não
   deixe apenas na pasta temporária.** No Windows o caminho da pasta temporária de
   sessão passa de 259 caracteres e o Excel recusa abrir o arquivo com o erro "o
   caminho do arquivo é maior que 259 caracteres". Só então apresente os arquivos.

5. Antes de apresentar, leia o `resultado.json` e resuma em texto o que importa:
   quantos estão incompletos, quais documentos faltam com mais frequência,
   colaboradores com vínculo indefinido, e qualquer "nome não confere" (que merece
   conferência manual imediata, pois pode ser arquivo trocado). Isso é mais útil
   que só entregar os arquivos.

Dependências: `pdftotext` (`apt-get install -y poppler-utils`) para extrair texto
dos PDFs, e `openpyxl` (`pip install openpyxl --break-system-packages`) para o Excel.

### Script: analisar_colaboradores.py

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Audita pastas de documentos de integracao de colaboradores (CLT e PJ),
comparando com o checklist padrao de integracao, verificando vencimentos
e se o nome do colaborador bate com o conteudo dos documentos.

Uso:
    python3 analisar_colaboradores.py <pasta_base> [--data-ref AAAA-MM-DD] [--contrato "MOTIVA PANTANAL"]

<pasta_base> deve conter uma subpasta por colaborador.
O vinculo (CLT ou PJ) e' detectado automaticamente pelos arquivos presentes.

Saida: JSON no stdout (consumido por gerar_excel.py e gerar_kanban.py).
"""
import sys
import os
import re
import json
import unicodedata
import subprocess
from datetime import datetime, date, timedelta

# ---------------------------------------------------------------------------
# Checklist de INTEGRACAO
# ---------------------------------------------------------------------------
# vinculo: "todos" | "clt" | "pj"
#   - "todos": exigido de qualquer colaborador
#   - "clt"/"pj": exigido apenas do vinculo correspondente
# required: True = obrigatorio; False = informativo (nao derruba o status)
# condicional: True = so' cobrado quando aplicavel (ex.: CNH) - vira aviso, nao pendencia
# ---------------------------------------------------------------------------
CHECKLIST = [
    # --- Comuns a todos os vinculos ---
    {"id": "ordem_servico", "label": "Ordem de Servico",
     "patterns": [r"ordem.*servico", r"\bos\b", r"ordem_de_servico"],
     "required": True, "vinculo": "todos", "validity": None},
    {"id": "ficha_epi", "label": "Ficha de Entrega de EPI",
     "patterns": [r"ficha.*epi", r"\bepi\b", r"entrega.*epi"],
     "required": True, "vinculo": "todos", "validity": None},
    {"id": "nr18", "label": "Treinamento NR-18",
     "patterns": [r"nr.?18"], "required": True, "vinculo": "todos",
     "verificar_nome": False,
     "validity": {"date_pattern": None, "days": None,
                  "note": "Certificado normalmente assinado como imagem - conferir validade/reciclagem manualmente."}},
    {"id": "nr06", "label": "Treinamento NR-06",
     "patterns": [r"nr.?0?6"], "required": True, "vinculo": "todos",
     "verificar_nome": False,
     "dispensado_contratos": ["motiva"],
     "validity": {"date_pattern": None, "days": None,
                  "note": "Certificado normalmente assinado como imagem - conferir validade/reciclagem manualmente. Dispensado nos contratos Motiva."}},
    {"id": "rg", "label": "RG",
     "patterns": [r"\brg\b", r"identidade"], "required": True, "vinculo": "todos",
     "verificar_nome": False, "validity": None},
    {"id": "cnh", "label": "CNH (quando aplicavel)",
     "patterns": [r"\bcnh\b"], "required": False, "condicional": True,
     "vinculo": "todos", "verificar_nome": False,
     "validity": {"date_pattern": None, "days": None,
                  "note": "Exigida apenas quando aplicavel a funcao; documento escaneado - validade nao extraivel automaticamente."}},
    {"id": "aso", "label": "ASO (Atestado de Saude Ocupacional)",
     "patterns": [r"\baso\b"], "required": True, "vinculo": "todos",
     "validity": {"date_pattern": r"(?:Exame Cl[íi]nico Ocupacional|Data)\D{0,15}(\d{2}/\d{2}/\d{4})",
                  "days": 365,
                  "note": "Validade padrao de 1 ano a partir do exame (ajustar conforme risco/PCMSO)."}},
    {"id": "foto", "label": "Foto",
     "patterns": [r"\bfoto\b"], "required": True, "vinculo": "todos", "validity": None},

    # --- Somente CLT ---
    {"id": "esocial", "label": "Cadastro no eSocial",
     "patterns": [r"e.?social"], "required": True, "vinculo": "clt", "validity": None},
    {"id": "ctps", "label": "CTPS",
     "patterns": [r"\bctps\b", r"carteira.*trabalho"], "required": True,
     "vinculo": "clt", "verificar_nome": False, "validity": None},

    # --- Somente PJ ---
    {"id": "contrato_prestacao", "label": "Contrato de Prestacao de Servico",
     "patterns": [r"contrato.*presta", r"presta.*servico", r"contrato.*servico"],
     "required": True, "vinculo": "pj", "validity": None},
    {"id": "ccmei", "label": "CCMEI (Certificado MEI)",
     "patterns": [r"\bccmei\b", r"\bmei\b", r"microempreendedor"],
     "required": True, "vinculo": "pj", "validity": None},
    {"id": "apr", "label": "APR (Analise Preliminar de Risco)",
     "patterns": [r"\bapr\b", r"analise.*preliminar"], "required": True,
     "vinculo": "pj", "verificar_nome": False, "validity": None},
    {"id": "decl_leis_trabalhistas", "label": "Declaracao de Atendimento as Leis Trabalhistas",
     "patterns": [r"decl.*(leis|trabalhist)", r"atendimento.*leis"],
     "required": True, "vinculo": "pj", "validity": None},
    {"id": "decl_sem_vinculo", "label": "Declaracao de Inexistencia de Vinculo Empregaticio",
     "patterns": [r"decl.*vinculo", r"inexistencia.*vinculo"],
     "required": True, "vinculo": "pj", "validity": None},
    {"id": "decl_sem_riscos", "label": "Declaracao de Inexistencia de Riscos (emitida pelo PJ)",
     "patterns": [r"decl.*inexist.*risco", r"inexistencia.*risco"],
     "required": True, "vinculo": "pj", "validity": None},
    {"id": "relacao_alojamentos", "label": "Relacao dos Alojamentos",
     "patterns": [r"rela[cç].*alojamento", r"alojamento"], "required": True,
     "vinculo": "pj", "verificar_nome": False, "validity": None},
]

# ---------------------------------------------------------------------------
# Documentos exigidos apenas por contratos especificos.
# Entram como AVISO informativo (nao derrubam o status), a menos que o contrato
# seja informado via --contrato, quando viram obrigatorios.
# ---------------------------------------------------------------------------
DOCS_POR_CONTRATO = [
    {"id": "cartao_vacina", "label": "Cartao de Vacina",
     "patterns": [r"vacina", r"cart.*vacin"],
     "contratos": ["motiva pantanal", "alcoa", "via brasil"], "verificar_nome": False},
    {"id": "tipo_sanguineo", "label": "Tipo Sanguineo + Fator RH",
     "patterns": [r"tipo.*sangu", r"fator.*rh", r"sangu"],
     "contratos": ["motiva pantanal"], "verificar_nome": False},
    {"id": "apolice_seguro", "label": "Apolice de Seguro",
     "patterns": [r"apolice", r"seguro"],
     "contratos": ["motiva pantanal"], "verificar_nome": False},
    {"id": "decl_alojamento", "label": "Declaracao de Alojamento",
     "patterns": [r"decl.*alojamento"],
     "contratos": ["motiva pantanal"]},
    {"id": "decl_riscos_eco", "label": "Declaracao de Riscos",
     "patterns": [r"decl.*risco"],
     "contratos": ["ecorodovias", "ecovias do araguaia", "ecovias capixaba", "ecoriominas"]},
    {"id": "decl_nao_obrig_nr", "label": "Declaracao de Nao Obrigatoriedade de NRs",
     "patterns": [r"decl.*(nao.*obrig|obrigatoriedade).*nr", r"nao.*obrigatoriedade"],
     "contratos": ["epr", "nova 381", "nova381", "nova 364", "nova364"]},
    {"id": "decl_n3", "label": "Declaracao de N3 - Permissao de Trabalho",
     "patterns": [r"\bn3\b", r"permissao.*trabalho"],
     "contratos": ["nova 381", "nova381"]},
]

CONTRATOS_CONHECIDOS = [
    "NOVA 381", "NOVA 364", "COPEL", "ENGETRENS", "EPR", "ROTA VERDE", "WAY262",
    "MOTIVAS", "MOTIVA PANTANAL", "ECOVIAS DO ARAGUAIA", "ECOVIAS CAPIXABA",
    "ECORIOMINAS", "AXIA", "BRASIL PCH", "ALCOA", "ELOVIAS", "VIA BRASIL",
    "VIA ARAUCARIA",
]

VENCENDO_EM_BREVE_DIAS = 30


def strip_accents(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def norm(s):
    return strip_accents(s).lower()


def pdftotext(path):
    try:
        out = subprocess.run(["pdftotext", "-layout", path, "-"],
                              capture_output=True, timeout=30)
        return out.stdout.decode("utf-8", errors="ignore")
    except Exception:
        return ""


def list_files(root):
    """Retorna lista de (caminho_absoluto, caminho_relativo)."""
    results = []
    for dirpath, dirnames, filenames in os.walk(root):
        for fn in filenames:
            if fn.lower() in ("thumbs.db", ".ds_store"):
                continue
            full = os.path.join(dirpath, fn)
            results.append((full, os.path.relpath(full, root)))
    return results


def find_match(patterns, files):
    """Procura um arquivo cujo nome bate com algum dos patterns (regex)."""
    for full, rel in files:
        name = norm(os.path.basename(rel))
        for pat in patterns:
            if re.search(pat, name):
                return full, rel
    return None, None


def detectar_vinculo(files):
    """Detecta se o colaborador e' PJ ou CLT pelos arquivos presentes.

    Sinais de PJ (CCMEI, contrato de prestacao de servico, declaracoes tipicas
    de PJ) tem precedencia, porque so' aparecem em dossies PJ. Na ausencia
    deles, sinais de CLT (CTPS, eSocial, ficha de registro) indicam CLT.
    Se nada aparecer, retorna "indefinido" - o script cobra apenas o que e'
    comum aos dois e sinaliza a duvida, em vez de assumir errado."""
    sinais_pj = [r"\bccmei\b", r"\bmei\b", r"microempreendedor", r"contrato.*presta",
                 r"presta.*servico", r"inexistencia.*vinculo", r"decl.*vinculo",
                 r"\bapr\b", r"analise.*preliminar"]
    sinais_clt = [r"\bctps\b", r"carteira.*trabalho", r"e.?social",
                  r"ficha.*registro", r"contrato.*experiencia"]

    if find_match(sinais_pj, files)[0]:
        return "pj"
    if find_match(sinais_clt, files)[0]:
        return "clt"
    return "indefinido"


MESES_PT = {
    "janeiro": 1, "fevereiro": 2, "marco": 3, "março": 3, "abril": 4, "maio": 5,
    "junho": 6, "julho": 7, "agosto": 8, "setembro": 9, "outubro": 10,
    "novembro": 11, "dezembro": 12,
}


def parse_data_flexivel(texto_data):
    """Aceita dd/mm/aaaa ou datas por extenso em PT-BR (ex.: '11 de julho de 2026')."""
    texto_data = texto_data.strip()
    m = re.search(r"(\d{1,2})/(\d{1,2})/(\d{4})", texto_data)
    if m:
        return date(int(m.group(3)), int(m.group(2)), int(m.group(1)))
    m = re.search(r"(\d{1,2})\s+de\s+([a-zçã]+)\s+de\s+(\d{4})", norm(texto_data))
    if m:
        mes = MESES_PT.get(m.group(2))
        if mes:
            return date(int(m.group(3)), mes, int(m.group(1)))
    return None


STOPWORDS_NOME = {"de", "da", "do", "dos", "das", "e"}


def tokens_nome(nome_pasta):
    """Extrai tokens significativos do nome da pasta do colaborador (para
    comparar com o texto dos documentos e detectar arquivo trocado/pasta errada)."""
    limpo = norm(nome_pasta.replace("_", " ").replace("-", " "))
    return [t for t in limpo.split() if len(t) >= 3 and t not in STOPWORDS_NOME]


def verifica_nome(texto, tokens):
    """Retorna (nome_confere, detalhe).
    None = nao verificavel; True/False = maioria dos tokens encontrada no texto."""
    if not tokens:
        return None, None
    if not texto or not texto.strip():
        return None, "Documento sem texto extraivel (escaneado/imagem) - nome nao verificavel."
    texto_norm = norm(texto)
    encontrados = [t for t in tokens if t in texto_norm]
    if len(encontrados) / len(tokens) >= 0.6:
        return True, None
    faltando = [t for t in tokens if t not in encontrados]
    return False, (f"Nome da pasta ('{' '.join(tokens)}') nao encontrado no texto do documento "
                   f"(faltando: {', '.join(faltando)}). Documento pode pertencer a outro "
                   f"colaborador ou estar na pasta errada.")


def compute_validade(texto, validity_cfg, data_ref):
    """Retorna (status_validade, detalhe) para um documento com regra de validade."""
    if not validity_cfg:
        return None, None
    if not validity_cfg.get("date_pattern"):
        return "nao_verificavel", validity_cfg.get("note", "Validade nao verificavel automaticamente.")
    m = re.search(validity_cfg["date_pattern"], texto, re.IGNORECASE)
    if not m:
        return "nao_verificavel", "Nao foi possivel localizar a data no texto extraido do documento."
    d = parse_data_flexivel(m.group(1))
    if not d:
        return "nao_verificavel", f"Data encontrada em formato inesperado: {m.group(1)!r}"

    dias = validity_cfg.get("days") or 0
    vencimento = d if dias == 0 else d + timedelta(days=dias)
    delta = (vencimento - data_ref).days
    if delta < 0:
        return "vencido", f"Vencido em {vencimento.strftime('%d/%m/%Y')} ({-delta} dias atras)."
    if delta <= VENCENDO_EM_BREVE_DIAS:
        return "vencendo", f"Vence em {vencimento.strftime('%d/%m/%Y')} (em {delta} dias)."
    return "ok", f"Valido ate {vencimento.strftime('%d/%m/%Y')}."


def montar_entry(item, files, tokens, data_ref, required_override=None):
    full, rel = find_match(item["patterns"], files)
    entry = {
        "id": item["id"],
        "label": item["label"],
        "required": item["required"] if required_override is None else required_override,
        "condicional": item.get("condicional", False),
        "presente": full is not None,
        "arquivo": rel,
        "status_validade": None,
        "detalhe_validade": None,
        "nome_confere": None,
        "nome_detalhe": None,
    }

    texto = pdftotext(full) if (full and full.lower().endswith(".pdf")) else None

    if full and item.get("validity"):
        status_validade, detalhe = compute_validade(texto or "", item["validity"], data_ref)
        entry["status_validade"] = status_validade
        entry["detalhe_validade"] = detalhe

    # Verifica se o nome do colaborador (da pasta) aparece no texto do documento.
    # Pulado para documentos que por natureza nao trazem o nome legivel
    # (certificados assinados como imagem, RG, CNH, APR, alojamentos) - checar
    # ali so' geraria falso alarme.
    if full and texto is not None and item.get("verificar_nome", True):
        nome_confere, nome_detalhe = verifica_nome(texto, tokens)
        entry["nome_confere"] = nome_confere
        entry["nome_detalhe"] = nome_detalhe

    return entry


def analisar_colaborador(pasta, data_ref, contrato=None):
    nome = os.path.basename(pasta.rstrip("/"))
    tokens = tokens_nome(nome)
    files = list_files(pasta)
    vinculo = detectar_vinculo(files)
    contrato_norm = norm(contrato) if contrato else None

    docs = []
    for item in CHECKLIST:
        v = item["vinculo"]
        if v != "todos" and v != vinculo:
            # Se o vinculo nao foi detectado, cobra so' o que e' comum aos dois
            # em vez de arriscar cobrar documento de PJ de um CLT (ou vice-versa)
            continue
        # NR-06 e' dispensada em alguns contratos
        req_override = None
        if contrato_norm and item.get("dispensado_contratos"):
            if any(c in contrato_norm for c in item["dispensado_contratos"]):
                req_override = False
        docs.append(montar_entry(item, files, tokens, data_ref, req_override))

    # Documentos especificos de contrato: obrigatorios se o contrato foi
    # informado e exige; caso contrario entram como aviso informativo.
    avisos_contrato = []
    for item in DOCS_POR_CONTRATO:
        exigido_aqui = bool(contrato_norm and any(c in contrato_norm for c in item["contratos"]))
        entry = montar_entry({**item, "required": exigido_aqui, "validity": None},
                              files, tokens, data_ref)
        entry["contratos"] = item["contratos"]
        if exigido_aqui:
            docs.append(entry)
        elif not entry["presente"]:
            avisos_contrato.append(
                f'{item["label"]} - exigido nos contratos: {", ".join(item["contratos"])}')
        else:
            docs.append(entry)  # presente na pasta: mostra no detalhamento

    faltantes = [d for d in docs if d["required"] and not d["presente"]]
    divergentes_nome = [d for d in docs if d["required"] and d["nome_confere"] is False]
    vencidos = [d for d in docs if d["status_validade"] == "vencido"]
    vencendo = [d for d in docs if d["status_validade"] == "vencendo"]
    nao_verificaveis = [d for d in docs if d["status_validade"] == "nao_verificavel"]
    opcionais_ausentes = [d for d in docs
                          if not d["required"] and d.get("condicional") and not d["presente"]]

    if vinculo == "indefinido":
        status_geral = "vinculo_indefinido"
    elif faltantes:
        status_geral = "incompleto"
    elif divergentes_nome:
        status_geral = "divergencia_nome"
    elif vencidos:
        status_geral = "vencido"
    elif vencendo:
        status_geral = "atencao"
    else:
        status_geral = "completo"

    return {
        "colaborador": nome,
        "vinculo": vinculo.upper(),
        "contrato": contrato or "-",
        "status_geral": status_geral,
        "documentos": docs,
        "resumo": {
            "faltantes": [d["label"] for d in faltantes],
            "divergentes_nome": [d["label"] for d in divergentes_nome],
            "vencidos": [d["label"] for d in vencidos],
            "vencendo": [d["label"] for d in vencendo],
            "nao_verificaveis": [d["label"] for d in nao_verificaveis],
            "condicionais_ausentes": [d["label"] for d in opcionais_ausentes],
            "avisos_contrato": avisos_contrato,
        },
    }


def main():
    # Windows redireciona stdout no codepage do console por padrao; nomes de
    # arquivo com acentuacao/caracteres especiais (ex.: "2a ADITIVO") corrompem
    # o JSON se nao forcarmos UTF-8 aqui.
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

    if len(sys.argv) < 2:
        print("Uso: analisar_colaboradores.py <pasta_base> [--data-ref AAAA-MM-DD] "
              "[--contrato NOME]", file=sys.stderr)
        sys.exit(1)
    pasta_base = sys.argv[1]

    data_ref = date.today()
    if "--data-ref" in sys.argv:
        data_ref = datetime.strptime(sys.argv[sys.argv.index("--data-ref") + 1], "%Y-%m-%d").date()

    contrato = None
    if "--contrato" in sys.argv:
        contrato = sys.argv[sys.argv.index("--contrato") + 1]

    resultados = []
    subpastas = sorted(d for d in os.listdir(pasta_base)
                       if os.path.isdir(os.path.join(pasta_base, d)))
    for sub in subpastas:
        resultados.append(analisar_colaborador(os.path.join(pasta_base, sub), data_ref, contrato))

    print(json.dumps({"data_ref": data_ref.isoformat(),
                      "contrato": contrato or "-",
                      "colaboradores": resultados},
                      ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
```

### Script: gerar_excel.py

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gera um relatorio .xlsx a partir do JSON produzido por analisar_colaboradores.py,
sempre na identidade visual da Angulo Social (mesma paleta do template
"Plano de Trabalho Angulo"): faixa vermelha de titulo, tipografia Segoe UI,
verde/ambar/vermelho/cinza para status. Essa e' a identidade visual padrao de
TODOS os relatorios desta skill - nao usar as cores genericas do Excel
(verde/amarelo/vermelho "de fabrica") a menos que o usuario peca outra coisa.

Uso:
    python3 analisar_colaboradores.py <pasta_base> > resultado.json
    python3 gerar_excel.py resultado.json saida.xlsx
"""
import sys
import json
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# ---------------------------------------------------------------------------
# Paleta Angulo Social
# ---------------------------------------------------------------------------
RED = "C1272D"
RED_DARK = "8F1C20"
RED_SOFT = "FBECEB"
INK = "1F2226"
MUTED = "5F6672"
GREEN = "2E7D5B"
GREEN_SOFT = "E7F4EE"
AMBER = "B7860B"
AMBER_SOFT = "FBF1DA"
GRAY = "6B7280"
GRAY_SOFT = "EEF0F2"
WHITE = "FFFFFF"
LINE = "E7E3E1"

FONT_NAME = "Segoe UI"

CORES_STATUS = {
    "completo": (GREEN_SOFT, GREEN),
    "atencao": (AMBER_SOFT, AMBER),
    "vencido": (RED_SOFT, RED_DARK),
    "incompleto": (RED_SOFT, RED_DARK),
    "divergencia_nome": (RED_SOFT, RED_DARK),
    "vinculo_indefinido": (GRAY_SOFT, GRAY),
}
CORES_VALIDADE = {
    "ok": (GREEN_SOFT, GREEN),
    "vencendo": (AMBER_SOFT, AMBER),
    "vencido": (RED_SOFT, RED_DARK),
    "nao_verificavel": (GRAY_SOFT, GRAY),
}

THIN_LINE = Side(style="thin", color=LINE)
BORDER_ALL = Border(left=THIN_LINE, right=THIN_LINE, top=THIN_LINE, bottom=THIN_LINE)


def fill(hex_color):
    return PatternFill("solid", fgColor=hex_color)


def font(bold=False, color=INK, size=11, italic=False):
    return Font(name=FONT_NAME, bold=bold, color=color, size=size, italic=italic)


def autosize(ws, max_width=60, min_width=10):
    for col_cells in ws.columns:
        length = max((len(str(c.value)) if c.value is not None else 0) for c in col_cells)
        letter = get_column_letter(col_cells[0].column)
        ws.column_dimensions[letter].width = min(max(length + 2, min_width), max_width)


def banner(ws, ultima_coluna, titulo, subtitulo):
    """Cabecalho de marca: faixa vermelha com titulo + linha de subtitulo cinza.
    Usa strings de coordenada (nao ws.cell(...)) para freeze_panes - acessar a
    celula via .cell() cria a linha no worksheet e desalinha o proximo append."""
    ws.merge_cells(f"A1:{ultima_coluna}1")
    c = ws["A1"]
    c.value = titulo
    c.font = font(bold=True, color=WHITE, size=14)
    c.fill = fill(RED)
    c.alignment = Alignment(vertical="center", horizontal="left", indent=1)
    ws.row_dimensions[1].height = 28

    ws.merge_cells(f"A2:{ultima_coluna}2")
    c2 = ws["A2"]
    c2.value = subtitulo
    c2.font = font(color=MUTED, italic=True, size=10)
    c2.alignment = Alignment(vertical="center", horizontal="left", indent=1)
    ws.row_dimensions[2].height = 18


def header_row(ws, row_idx, headers):
    for i, h in enumerate(headers, start=1):
        c = ws.cell(row=row_idx, column=i, value=h)
        c.font = font(bold=True, color=WHITE, size=10.5)
        c.fill = fill(INK)
        c.alignment = Alignment(wrap_text=True, vertical="center", horizontal="center")
        c.border = BORDER_ALL
    ws.row_dimensions[row_idx].height = 30
    ws.freeze_panes = f"A{row_idx + 1}"


def status_badge_text(status):
    return status.replace("_", " ").capitalize()


def main():
    if len(sys.argv) < 3:
        print("Uso: gerar_excel.py <resultado.json> <saida.xlsx>", file=sys.stderr)
        sys.exit(1)
    with open(sys.argv[1], encoding="utf-8") as f:
        data = json.load(f)

    wb = Workbook()

    # --- Aba Resumo ---
    ws = wb.active
    ws.title = "Resumo"
    headers = ["Colaborador", "Vinculo", "Contrato", "Status Geral",
               "Documentos Faltantes",
               "Possivel Doc. Trocado (nome nao confere)",
               "Documentos Vencidos", "Vencendo em Breve",
               "A Verificar Manualmente", "Condicionais Ausentes (ex.: CNH)"]
    banner(ws, get_column_letter(len(headers)),
           "Angulo Social  |  Auditoria de Documentos de Integracao",
           f'Data de referencia: {data["data_ref"]}    Contrato: {data.get("contrato", "-")}')
    header_row(ws, 3, headers)

    for col in data["colaboradores"]:
        r = col["resumo"]
        ws.append([
            col["colaborador"].replace("_", " "),
            col.get("vinculo", "-"),
            col.get("contrato", "-"),
            status_badge_text(col["status_geral"]),
            ", ".join(r["faltantes"]) or "-",
            ", ".join(r.get("divergentes_nome", [])) or "-",
            ", ".join(r["vencidos"]) or "-",
            ", ".join(r["vencendo"]) or "-",
            ", ".join(r["nao_verificaveis"]) or "-",
            ", ".join(r.get("condicionais_ausentes", [])) or "-",
        ])
        row_idx = ws.max_row
        bg, fg = CORES_STATUS.get(col["status_geral"], (GRAY_SOFT, GRAY))
        cell = ws.cell(row=row_idx, column=4)
        cell.fill = fill(bg)
        cell.font = font(bold=True, color=fg)

    for row in ws.iter_rows(min_row=4):
        for cell in row:
            cell.alignment = Alignment(wrap_text=True, vertical="top")
            cell.border = BORDER_ALL
            if cell.column != 4:
                cell.font = font(color=INK)
    autosize(ws)
    ws.column_dimensions["A"].width = 22

    # --- Aba Detalhado ---
    ws2 = wb.create_sheet("Detalhado")
    headers2 = ["Colaborador", "Vinculo", "Documento", "Obrigatorio", "Presente",
                "Arquivo", "Nome Confere", "Status Validade", "Detalhe"]
    banner(ws2, get_column_letter(len(headers2)),
           "Angulo Social  |  Auditoria de Documentos de Integracao - Detalhado",
           f'Data de referencia: {data["data_ref"]}    Contrato: {data.get("contrato", "-")}')
    header_row(ws2, 3, headers2)

    for col in data["colaboradores"]:
        for doc in col["documentos"]:
            nome_confere = doc.get("nome_confere")
            nome_confere_txt = {True: "Sim", False: "NAO - conferir", None: "-"}[nome_confere]
            if doc["required"]:
                obrig = "Sim"
            elif doc.get("condicional"):
                obrig = "Se aplicavel"
            else:
                obrig = "Nao"
            detalhe = doc["detalhe_validade"] or doc.get("nome_detalhe") or "-"
            ws2.append([
                col["colaborador"].replace("_", " "),
                col.get("vinculo", "-"),
                doc["label"],
                obrig,
                "Sim" if doc["presente"] else "NAO",
                doc["arquivo"] or "-",
                nome_confere_txt,
                status_badge_text(doc["status_validade"] or "-"),
                detalhe,
            ])
            r = ws2.max_row
            presente_cell = ws2.cell(row=r, column=5)
            if doc["required"] and not doc["presente"]:
                presente_cell.fill = fill(RED_SOFT)
                presente_cell.font = font(bold=True, color=RED_DARK)
            elif doc["presente"]:
                presente_cell.fill = fill(GREEN_SOFT)
                presente_cell.font = font(bold=True, color=GREEN)

            nome_cell = ws2.cell(row=r, column=7)
            if nome_confere is False:
                nome_cell.fill = fill(RED_SOFT)
                nome_cell.font = font(bold=True, color=RED_DARK)

            if doc["status_validade"]:
                bg, fg = CORES_VALIDADE.get(doc["status_validade"], (GRAY_SOFT, GRAY))
                vc = ws2.cell(row=r, column=8)
                vc.fill = fill(bg)
                vc.font = font(bold=True, color=fg)

    for row in ws2.iter_rows(min_row=4):
        for cell in row:
            cell.alignment = Alignment(wrap_text=True, vertical="top")
            cell.border = BORDER_ALL
    autosize(ws2)
    ws2.column_dimensions["A"].width = 22
    ws2.column_dimensions["I"].width = 55

    # --- Aba Avisos por Contrato ---
    ws3 = wb.create_sheet("Avisos por Contrato")
    headers3 = ["Colaborador", "Documento exigido apenas em contratos especificos"]
    banner(ws3, get_column_letter(len(headers3)),
           "Angulo Social  |  Avisos por Contrato",
           "Informativo - so vira pendencia obrigatoria se o contrato especifico for informado.")
    header_row(ws3, 3, headers3)
    for col in data["colaboradores"]:
        for aviso in col["resumo"].get("avisos_contrato", []):
            ws3.append([col["colaborador"].replace("_", " "), aviso])
    for row in ws3.iter_rows(min_row=4):
        for cell in row:
            cell.alignment = Alignment(wrap_text=True, vertical="top")
            cell.border = BORDER_ALL
            cell.font = font(color=MUTED)
    autosize(ws3)
    ws3.column_dimensions["A"].width = 22
    ws3.column_dimensions["B"].width = 70

    for sheet in (ws, ws2, ws3):
        sheet.sheet_view.showGridLines = False

    wb.save(sys.argv[2])
    print(f"Relatorio (identidade Angulo Social) salvo em {sys.argv[2]}")


if __name__ == "__main__":
    main()
```

### Script: gerar_kanban.py

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gera um quadro Kanban (HTML autocontido) a partir do JSON produzido por
analisar_colaboradores.py.

Cada colaborador vira um card. Os badges de status ("N faltando",
"N a verificar", "N vencido(s)" etc.) sao CLICAVEIS: ao clicar, abrem/fecham
a lista correspondente (recolhida por padrao).

O badge "faltando" abre um CHECKLIST de caixas de marcar. O que voce marcar
fica salvo no navegador (localStorage). Quando TODAS as caixas de um
colaborador sao marcadas, o card sai da coluna "Incompleto" e vai para a
coluna "Revisados" (tambem persistido).

Uso:
    python3 gerar_kanban.py <resultado.json> <saida.html>
"""
import sys
import json
import re
import html as htmlmod

# Paleta Angulo Social (mesma do gerar_excel.py e do template "Plano de Trabalho Angulo")
COLUNAS = [
    ("incompleto", "Incompleto", "#c1272d"),          # vermelho de marca
    ("divergencia_nome", "Nome Nao Confere", "#8f1c20"),  # vermelho escuro
    ("vinculo_indefinido", "Vinculo Indefinido", "#6b7280"),  # cinza
    ("vencido", "Vencido", "#a5561f"),                 # terracota
    ("atencao", "Atencao", "#b7860b"),                 # ambar
    ("completo", "Completo", "#2e7d5b"),                # verde
    ("revisados", "Revisados", "#4a5568"),              # cinza-escuro neutro
]


def slug(s):
    return re.sub(r"[^a-z0-9]+", "_", str(s).lower()).strip("_")


def badge_estatico(texto, cor_fundo):
    """Badge simples, sem acao de clique (ex.: vinculo)."""
    return (f'<span style="background:{cor_fundo};color:#fff;border-radius:10px;'
            f'padding:2px 8px;font-size:11px;margin:2px 4px 0 0;display:inline-block;">'
            f'{htmlmod.escape(texto)}</span>')


def badge_toggle(texto, cor_fundo, panel_id):
    """Badge clicavel que abre/fecha um painel (data-toggle -> id do painel)."""
    return (f'<span class="badge-tg" data-toggle="{panel_id}" '
            f'style="background:{cor_fundo};color:#fff;border-radius:10px;'
            f'padding:2px 8px;font-size:11px;margin:2px 4px 0 0;display:inline-block;'
            f'cursor:pointer;user-select:none;">'
            f'{htmlmod.escape(texto)} <span class="caret" style="font-size:9px;">&#9656;</span></span>')


def painel(panel_id, inner):
    """Painel recolhido por padrao (display:none), aberto pelo badge."""
    return (f'<div class="tg-panel" id="{panel_id}" style="display:none;'
            f'margin-top:8px;border-top:1px dashed #e0e0e0;padding-top:8px;">{inner}</div>')


def checklist_inner(ck, faltantes):
    """Conteudo do painel de faltantes: checklist + contador de progresso."""
    itens = []
    for doc in faltantes:
        key = f"{ck}__{slug(doc)}"
        itens.append(
            f'<label style="display:flex;align-items:flex-start;gap:8px;'
            f'font-size:12px;color:#333;margin:4px 0;cursor:pointer;">'
            f'<input type="checkbox" class="doc-chk" data-collab="{ck}" '
            f'data-key="{key}" style="margin-top:2px;flex:none;">'
            f'<span class="doc-lbl">{htmlmod.escape(doc)}</span></label>')
    total = len(faltantes)
    return (
        f'<div style="display:flex;justify-content:space-between;align-items:center;">'
        f'<span style="font-size:11px;font-weight:600;color:#c1272d;text-transform:uppercase;'
        f'letter-spacing:.3px;">Documentos faltantes</span>'
        f'<span class="doc-prog" data-collab="{ck}" data-total="{total}" '
        f'style="font-size:11px;color:#777;">0/{total} coletados</span></div>'
        f'<div style="margin-top:4px;">{"".join(itens)}</div>')


def lista_inner(itens):
    """Conteudo de um painel de notas (lista simples)."""
    lis = "".join(f"<li>{htmlmod.escape(i)}</li>" for i in itens)
    return (f'<ul style="margin:0;padding-left:18px;font-size:12px;color:#555;">{lis}</ul>')


def card_html(col, status_orig):
    r = col["resumo"]
    ck = slug(col["colaborador"])

    badges = badge_estatico(col.get("vinculo", "-"), "#1f2226")
    paineis = ""

    if r["faltantes"]:
        pid = f"falt_{ck}"
        badges += badge_toggle(f'{len(r["faltantes"])} faltando', "#c1272d", pid)
        paineis += painel(pid, checklist_inner(ck, r["faltantes"]))
    if r.get("divergentes_nome"):
        pid = f"nome_{ck}"
        badges += badge_toggle(f'{len(r["divergentes_nome"])} nome nao confere', "#8f1c20", pid)
        paineis += painel(pid, lista_inner(r["divergentes_nome"]))
    if r["vencidos"]:
        pid = f"venc_{ck}"
        badges += badge_toggle(f'{len(r["vencidos"])} vencido(s)', "#a5561f", pid)
        paineis += painel(pid, lista_inner(r["vencidos"]))
    if r["vencendo"]:
        pid = f"vcdo_{ck}"
        badges += badge_toggle(f'{len(r["vencendo"])} vencendo', "#b7860b", pid)
        paineis += painel(pid, lista_inner(r["vencendo"]))
    if r["nao_verificaveis"]:
        pid = f"verif_{ck}"
        badges += badge_toggle(f'{len(r["nao_verificaveis"])} a verificar', "#6b7280", pid)
        paineis += painel(pid, lista_inner(r["nao_verificaveis"]))

    avisos = ""
    if r.get("avisos_contrato"):
        lis = "".join(f"<li>{htmlmod.escape(a)}</li>" for a in r["avisos_contrato"])
        avisos = (f'<details style="margin-top:8px;font-size:11px;color:#777;">'
                  f'<summary style="cursor:pointer;">Exigidos so em contratos especificos '
                  f'({len(r["avisos_contrato"])})</summary>'
                  f'<ul style="margin:4px 0 0 0;padding-left:18px;">{lis}</ul></details>')

    # data-orig = coluna de origem (pra onde o card volta se desmarcar um item).
    return f'''
    <div class="card" data-collab="{ck}" data-orig="{status_orig}"
         style="background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.15);
                padding:12px;margin-bottom:10px;">
      <div style="font-weight:600;font-size:14px;color:#222;">{htmlmod.escape(col["colaborador"].replace("_", " "))}</div>
      <div style="margin-top:6px;">{badges}</div>
      {paineis}
      {avisos}
    </div>'''


SCRIPT_PERSIST = """
<script>
(function () {
  var NS = 'auditoria_integracao::' + (document.title || '');
  function load() { try { return JSON.parse(localStorage.getItem(NS) || '{}'); } catch (e) { return {}; } }
  function save(s) { try { localStorage.setItem(NS, JSON.stringify(s)); } catch (e) {} }
  var estado = load();
  var PLACEHOLDER = '<div class="col-vazio" style="color:#aaa;font-size:12px;">Nenhum</div>';

  function colBody(key) { return document.getElementById('colbody_' + key); }

  // ---- Badges clicaveis: abrem/fecham o painel correspondente ----
  document.querySelectorAll('.badge-tg').forEach(function (b) {
    b.addEventListener('click', function () {
      var panel = document.getElementById(b.getAttribute('data-toggle'));
      if (!panel) return;
      var aberto = panel.style.display !== 'none';
      panel.style.display = aberto ? 'none' : 'block';
      var caret = b.querySelector('.caret');
      if (caret) caret.innerHTML = aberto ? '&#9656;' : '&#9662;';
    });
  });

  function atualizaProgresso(collab) {
    var chks = document.querySelectorAll('.doc-chk[data-collab="' + collab + '"]');
    var marcados = 0;
    chks.forEach(function (c) { if (c.checked) marcados++; });
    var prog = document.querySelector('.doc-prog[data-collab="' + collab + '"]');
    if (prog) {
      var total = prog.getAttribute('data-total');
      prog.textContent = marcados + '/' + total + ' coletados';
      prog.style.color = (marcados == total && total > 0) ? '#4a5568' : '#777';
    }
  }

  // Move o card para "Revisados" quando todas as caixas estao marcadas;
  // devolve para a coluna de origem se alguma for desmarcada.
  function moveCard(collab) {
    var card = document.querySelector('.card[data-collab="' + collab + '"]');
    if (!card) return;
    var chks = card.querySelectorAll('.doc-chk');
    if (chks.length === 0) return;  // card sem checklist nao se move
    var todos = true;
    chks.forEach(function (c) { if (!c.checked) todos = false; });
    var destino = todos ? colBody('revisados') : colBody(card.getAttribute('data-orig'));
    if (destino && card.parentNode !== destino) destino.appendChild(card);
    card.style.opacity = todos ? '0.8' : '1';
    card.style.borderLeft = todos ? '4px solid #4a5568' : 'none';
  }

  function recomputaColunas() {
    document.querySelectorAll('.col-body').forEach(function (body) {
      var placeholder = body.querySelector('.col-vazio');
      var cards = body.querySelectorAll('.card').length;
      if (cards === 0 && !placeholder) body.insertAdjacentHTML('beforeend', PLACEHOLDER);
      if (cards > 0 && placeholder) placeholder.remove();
    });
    document.querySelectorAll('.col-count').forEach(function (span) {
      var body = colBody(span.getAttribute('data-col'));
      span.textContent = body ? body.querySelectorAll('.card').length : 0;
    });
  }

  // ---- Checkboxes: persistem e disparam a movimentacao ----
  document.querySelectorAll('.doc-chk').forEach(function (chk) {
    var key = chk.getAttribute('data-key');
    if (estado[key]) {
      chk.checked = true;
      var lbl = chk.parentNode.querySelector('.doc-lbl');
      if (lbl) { lbl.style.textDecoration = 'line-through'; lbl.style.color = '#999'; }
    }
    chk.addEventListener('change', function () {
      estado[key] = chk.checked;
      save(estado);
      var lbl = chk.parentNode.querySelector('.doc-lbl');
      if (lbl) {
        lbl.style.textDecoration = chk.checked ? 'line-through' : 'none';
        lbl.style.color = chk.checked ? '#999' : '#333';
      }
      var collab = chk.getAttribute('data-collab');
      atualizaProgresso(collab);
      moveCard(collab);
      recomputaColunas();
    });
  });

  // Estado inicial: progresso + move cards ja concluidos.
  var vistos = {};
  document.querySelectorAll('.doc-chk').forEach(function (chk) {
    var c = chk.getAttribute('data-collab');
    if (!vistos[c]) { vistos[c] = true; atualizaProgresso(c); moveCard(c); }
  });
  recomputaColunas();
})();
</script>
"""


def main():
    if len(sys.argv) < 3:
        print("Uso: gerar_kanban.py <resultado.json> <saida.html>", file=sys.stderr)
        sys.exit(1)
    with open(sys.argv[1], encoding="utf-8") as f:
        data = json.load(f)

    colunas_html = []
    for key, titulo, cor in COLUNAS:
        # "revisados" comeca vazia; o JS move os cards concluidos pra ca.
        cards = [] if key == "revisados" else [c for c in data["colaboradores"]
                                               if c["status_geral"] == key]
        cards_html = "".join(card_html(c, key) for c in cards)
        colunas_html.append(f'''
        <div style="flex:1;min-width:230px;background:#f4f5f7;border-radius:10px;padding:10px;">
          <div style="font-weight:700;color:{cor};border-bottom:2px solid {cor};
                      padding-bottom:6px;margin-bottom:10px;">{titulo} (<span class="col-count" data-col="{key}">{len(cards)}</span>)</div>
          <div class="col-body" id="colbody_{key}">{cards_html}</div>
        </div>''')

    contrato = data.get("contrato", "-")
    doc = f'''<!DOCTYPE html>
<html lang="pt-br">
<head>
<meta charset="utf-8">
<title>Auditoria de Documentos de Integracao</title>
</head>
<body style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#faf8f7;color:#1f2226;margin:0;padding:0 0 24px 0;">
  <div style="background:#c1272d;color:#fff;padding:18px 24px;margin-bottom:20px;">
    <h2 style="margin:0 0 4px 0;color:#fff;">Angulo Social &nbsp;|&nbsp; Auditoria de Documentos de Integracao</h2>
    <div style="color:#fbeceb;font-size:13px;">
      Data de referencia: {data["data_ref"]} &nbsp;|&nbsp; Contrato: {htmlmod.escape(str(contrato))}
    </div>
  </div>
  <div style="padding:0 24px;">
  <div style="color:#5f6672;font-size:12px;margin-bottom:20px;">
    Clique nos badges (ex.: <b>faltando</b>, <b>a verificar</b>) para abrir a lista. Ao concluir o checklist de faltantes,
    o card vai para <b>Revisados</b>. O progresso fica salvo neste navegador.
  </div>
  <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start;">
    {"".join(colunas_html)}
  </div>
  </div>
  {SCRIPT_PERSIST}
</body>
</html>'''

    with open(sys.argv[2], "w", encoding="utf-8") as f:
        f.write(doc)
    print(f"Kanban salvo em {sys.argv[2]}")


if __name__ == "__main__":
    main()
```

## Observações e limitações

- Documentos escaneados ou assinados como imagem (RG, CNH, certificados NR) não
  têm texto extraível — o script confirma apenas a **presença** do arquivo e marca
  validade/nome como "a verificar manualmente", em vez de arriscar falso resultado.
- O reconhecimento é por nome de arquivo (regex tolerante a maiúsculas e acentos),
  então depende de nomes minimamente descritivos. Arquivos como "doc1.pdf" ou
  "scan_final.pdf" serão marcados como faltantes mesmo existindo — nesse caso
  renomeie antes de rodar, ou confirme manualmente.
- A verificação de nome é heurística (60% dos termos encontrados). Trate
  `nome_confere: false` como alerta para conferência, não como certeza de erro.
- No Kanban os badges abrem/fecham painéis; o badge "faltando" traz um checklist
  cujo progresso é salvo no localStorage do navegador. Ao concluir o checklist o
  card vai para "Revisados". É por máquina/navegador — não sincroniza entre
  computadores e some se o histórico/localStorage for limpo.
- A validade do ASO (1 ano) e o "vencendo em breve" (30 dias) são padrões
  configuráveis no topo do script — ajuste se a política for diferente.
- Use sempre a data real do sistema (`date +%Y-%m-%d`), nunca uma data fixa.
- **Copie os arquivos finais (.xlsx e .html) para a pasta do usuário antes de
  apresentar.** No Windows, o caminho da pasta temporária de sessão do Cowork passa
  de 259 caracteres e o Excel recusa abrir o arquivo com o erro "o caminho do
  arquivo é maior que 259 caracteres".
