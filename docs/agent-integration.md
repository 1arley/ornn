# Agent Integration

Como um agente de IA integra este repositório: a ordem de operação, a composição de
skills, os workflows, e os anti-padrões. Este documento é a ponte entre as peças
(`AGENTS.md`, `skills/`, `references/`, `templates/`) e a execução real.

---

## 1. Visão geral

```text
                    AGENT
                      │
                      ↓
                SKILL ROUTER        ← skills/meta/skill-router/
                      │
          ┌───────────┼───────────┐
          ↓           ↓           ↓
       AUDIT       PRODUCT     FRONTEND      ← skills/audit, security, reliability,
          │           │           │             product, frontend
          └───────────┼───────────┘
                      ↓
               RESEARCH ROUTER     ← skills/meta/research-router/
                      │
        ┌─────────────┼─────────────┐
        ↓             ↓             ↓
      GitHub       Products      References    ← skills/research/* + references/*.yaml
        │             │             │
        └─────────────┼─────────────┘
                      ↓
                  SYNTHESIS         ← formato de síntese (AGENTS.md § 5)
                      │
                      ↓
                 IMPLEMENT
                      │
                      ↓
              ADVERSARIAL TEST      ← skills/audit/adversarial-review
                      │
                      ↓
                   VERIFY
                      │
                      ↓
                   REPORT           ← templates/*
```

O agente não "executa todas as skills". Ele **rota** — escolhe o subconjunto relevante
pelo `skill-router`, pesquisa pelo `research-router`, implementa, ataca a própria
implementação, verifica, e reporta.

---

## 2. Ordem de operação

### 2.1 Workflow completo (auditoria / feature não-trivial)

```text
REQUEST → UNDERSTAND → CLASSIFY → SKILL ROUTER → RESEARCH ROUTER → RESEARCH →
ANALYZE → IMPLEMENT → ADVERSARIAL TEST → VERIFY → REPORT
```

| Etapa | O que o agente faz | Onde |
|---|---|---|
| REQUEST | Recebe o pedido | — |
| UNDERSTAND | Reformula o pedido: sistema, fluxo, mudança, risco | — |
| CLASSIFY | Categoria dominante (audit/security/reliability/product/frontend/research) + sinais (valor transferível, estado compartilhado, permissões) | — |
| SKILL ROUTER | Seleciona o conjunto ordenado de skills | `skills/meta/skill-router/` |
| RESEARCH ROUTER | Decide onde pesquisar | `skills/meta/research-router/` + `references/` |
| RESEARCH | Coleta + sintetiza (nunca só links) | skills de research + `AGENTS.md` § 5 |
| ANALYZE | Aplica as skills selecionadas ao alvo | skills selecionadas |
| IMPLEMENT | Faz a mudança (se aplicável) | — |
| ADVERSARIAL TEST | Ataca a própria implementação | `adversarial-review` + skills relevantes |
| VERIFY | Confirma evidência; sobe/desce confiança | escala de evidência `AGENTS.md` § 2 |
| REPORT | Produz o relatório | `templates/audit-report.md` etc. |

### 2.2 Pesquisa antes de implementar (regra §13)

```text
UNDERSTAND → CLASSIFY → RESEARCH → COMPARE → DECIDE → IMPLEMENT
```

Não:

```text
UNDERSTAND → IMPLEMENT
```

**Mas proporcional:** um botão simples não precisa de pesquisa; uma arquitetura nova
provavelmente precisa; concorrência em pagamentos certamente. Critério:

```text
uncertainty + impact + irreversibility
```

quanto maior, maior o nível de pesquisa (`none` / `proportional` / `full`).

---

## 3. Como o agente escolhe skills

1. Leia o frontmatter de cada skill candidata (`triggers`, `category`, `priority`).
2. Cruze com a tabela de composição do `skill-router` (§14/§22).
3. Ordena: hipóteses (adversarial-review) → confirmação (race, idempotência, etc.) →
   domínio específico (frontend, product).
4. **Justifique** a seleção e o que foi descartado (evita overengineering e mostra
   cobertura).

Exemplo (do `skill-router`):

```text
"Adicionar reações que dão XP"
        ↓
gamification-audit
business-logic-audit
idempotency-audit
race-condition-hunter
api-abuse-audit
user-flow-audit
```

---

## 4. Como o agente pesquisa

1. Determine o tipo de problema (animation/ux/architecture/security/...).
2. Consulte `references/*.yaml` do domínio (`use_when` × problema).
3. Respeite `type` (methodology/heuristic/inspiration/implementation/discovery) e
   `authority` (established > vendor > community > curated).
4. Despache para a research skill correta.
5. **Sintetize** — nunca retorne lista de links. Formato: Reference / Relevant
   Pattern / Why It Matters / Adaptation / Trade-offs / Recommendation.
6. **Não copie** — extraia princípios, adapte, avalie trade-offs (`AGENTS.md` § 1).

---

## 5. Como o agente reporta

- **Auditoria completa** → `templates/audit-report.md` (findings com Severity,
  Confidence, Reprodução, Causa raiz, etc. + dedup entre skills).
- **Bug individual** → `templates/bug-report.md`.
- **Frontend/design** → `templates/design-review.md` (dimensões + checklist WCAG).
- **Pesquisa** → `templates/research-report.md` (síntese obrigatória + fontes +
  autoridade + confiança).

Todo finding carrega um nível de confiança:

```text
CONFIRMED         reproduzido com evidência direta
HIGH CONFIDENCE   forte indício técnico, sem reprodução
POSSIBLE          plausível, exige investigação
SPECULATIVE       hipótese sem evidência → seção "riscos", não bugs
```

---

## 6. Deduplicação entre skills

Múltiplas skills podem apontar o mesmo defeito (ex: race → idempotency; authorization
→ input-trust). Regras:

1. **Consolidar** — um finding único com a análise combinada (ex: "raça + falta de
   idempotência na criação de pedido").
2. **Atribuir a skill mais específica** — a que explica a causa raiz (ex:
   `race-condition-hunter` explica o *mecanismo*; `idempotency-audit` explica o *efeito*).
3. **Não duplicar** — se duas skills apontam o mesmo, cite ambas na seção de
   deduplicação do relatório.

---

## 7. Anti-padrões

| Anti-padrão | Correto |
|---|---|
| Executar todas as skills sempre | Rotear pelo `skill-router`, proporcional ao risco |
| Pesquisar tudo sempre | Research proporcional (uncertainty + impact + irreversibility) |
| Relatórios gigantes | Concisos, priorizados, acionáveis |
| Consultar referências irrelevantes | Cruzar `use_when` × problema |
| Transformar qualquer coisa estranha em bug | Aplicar a seção "False Positives" de cada skill |
| Tratar inspiração como evidência | Fontes `inspiration`/`curated` só calibram gosto |
| Copiar código/layout de referências | Extrair princípios, adaptar |
| Reportar SPECULATIVE como bug | Listar como risco a verificar |
| Inventar skill inexistente | Verificar `skills/`; marcar gap |

---

## 8. Referência rápida

| Precisa de… | Onde |
|---|---|
| Regras globais + escala de evidência | `AGENTS.md` |
| Seleção de skills | `skills/meta/skill-router/` |
| Seleção de fontes | `skills/meta/research-router/` + `references/` |
| Como escrever uma skill | `docs/skill-authoring.md` |
| Como adicionar referência | `docs/reference-authoring.md` |
| Princípios do projeto | `docs/philosophy.md` |
| Relatório de auditoria | `templates/audit-report.md` |
| Bug report | `templates/bug-report.md` |
| Design review | `templates/design-review.md` |
| Research report | `templates/research-report.md` |
| Exemplos reais | `examples/` |
| Validação do repositório | `python3 scripts/validate.py` |
