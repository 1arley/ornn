# AGENTS.md — Regras globais do agente

> **Don't just review the code. Attack the assumptions behind the system.**

Este arquivo define as regras globais que todo agente que opera sobre este repositório
deve seguir. As skills em `skills/` ensinam **como pensar**; as referências em `references/`
ensinam **onde olhar**; este arquivo define o **comportamento base** que governa ambos.

O objetivo final não é criar um agente que sabe mais.
É criar um agente que **sabe como descobrir mais, onde procurar, quais perguntas fazer
e como verificar se está certo**.

---

## 1. Regras de investigação

Antes de concluir qualquer coisa, o agente deve:

* **Investigar antes de concluir.** Nunca reportar um bug a partir de uma hipótese
  não verificada. Toda conclusão precisa de evidência.
* **Pensar em invariantes.** Para cada componente, identificar o que **deve** ser
  sempre verdade. Um invariant violado é quase sempre um bug real.
* **Considerar estados.** Toda operação ocorre sobre um estado. Perguntar: qual o
  estado antes? qual o estado depois? quais estados são possíveis? quais são
  impossíveis? quais são não-desejados mas alcançáveis?
* **Testar repetição.** O que acontece se a mesma operação for executada N vezes?
  (Recompensa duplicada? contador inflado? recurso criado várias vezes?)
* **Testar reversão.** O que acontece se a operação for desfeita e refeita?
  (Farming infinito? estado inconsistente? perda de dados?)
* **Testar concorrência.** O que acontece se dois requests modificam o mesmo estado
  simultaneamente? (Race condition? double-spend? estado corrompido?)
* **Não confiar no frontend.** O frontend é uma sugestão, não uma fonte de verdade.
  Validação de cliente pode ser ignorada. Campos como `userId`, `role`, `price`, `XP`
  nunca devem ser confiados sem validação no servidor.
* **Verificar APIs diretamente.** Tratar a API como diretamente acessível, ignorando
  a UI. O usuário malicioso não usa o frontend; ele chama os endpoints.
* **Pesquisar referências quando necessário.** Para tarefas não triviais, perguntar
  "alguém já resolveu esse problema?" e consultar `references/` antes de reinventar.
  Ver `references/` e o `research-router`.
* **Distinguir inspiração de evidência.** Referências externas são inspiração
  (princípios, padrões, trade-offs), não especificação. Extrair ideias, nunca copiar
  cegamente código, layout, branding ou componentes proprietários.
* **Minimizar falsos positivos.** Antes de reportar um comportamento estranho como
  bug, confirmar que ele é realmente um defeito e não um comportamento aceitável ou
  intencional. Consultar a seção "False Positives" da skill usada.
* **Reportar evidências.** Todo finding deve ser classificado por nível de confiança
  (ver abaixo) e incluir reprodução, causa raiz e impacto.

---

## 2. Classificação de evidência

Todo finding deve ser classificado em um destes quatro níveis. Nunca transformar uma
hipótese em bug confirmado.

```text
CONFIRMED         — reproduzido com evidência direta (logs, teste, reprodução passo a passo)
HIGH CONFIDENCE   — forte indício técnico, mas sem reprodução completa
POSSIBLE          — plausível, exige mais investigação para confirmar ou descartar
SPECULATIVE       — hipótese sem evidência direta; reportar apenas como risco, não como bug
```

Regra prática: se você não consegue reproduzir, no máximo é `HIGH CONFIDENCE`.
Se você não consegue apontar o mecanismo exato, no máximo é `POSSIBLE`.
Se é "acho que pode acontecer", é `SPECULATIVE` — e findings `SPECULATIVE` não devem
bloquear implementação, apenas ser listados como riscos a verificar.

Após composição, confidence é **recalculada a partir da evidência consolidada**; nunca
é o maior nível declarado por uma skill. Três skills dizendo `CONFIRMED` sem reprodução
continuam sem confirmação. O consolidator (`scripts/findings.py`) exige:

* `CONFIRMED`: mecanismo exato + evidência direta com ação e resultado observado;
* `HIGH CONFIDENCE`: mecanismo exato + evidência estrutural com localização concreta;
* `POSSIBLE`: mecanismo ou evidência incompleta;
* `SPECULATIVE`: sem mecanismo e sem evidência suficiente.

Todo finding consolidado preserva `generated_by`, `investigated_by`, `verified_by` e
registros de `evidence`. A identidade para dedup usa componente, invariant, mecanismo,
transição de estado e impacto.

---

## 3. Pesquisar antes de reinventar

Para tarefas não triviais, o agente deve seguir o fluxo:

```text
UNDERSTAND  →  CLASSIFY  →  RESEARCH  →  COMPARE  →  DECIDE  →  IMPLEMENT
```

Não:

```text
UNDERSTAND  →  IMPLEMENT
```

Mas **pesquisa deve ser proporcional à complexidade**.

* Um botão simples não precisa de pesquisa.
* Uma arquitetura nova provavelmente precisa.
* Um padrão de concorrência em pagamentos certamente precisa.

Quando apropriado, pesquisar nesta ordem:

1. código existente no projeto;
2. documentação oficial;
3. GitHub;
4. produtos reais;
5. design systems;
6. sites especializados;
7. artigos técnicos;
8. galerias de inspiração.

A ordem reflete confiabilidade: o que já existe no projeto e a documentação oficial
vêm antes de inspiração externa.

---

## 4. Workflow completo de auditoria

Para uma auditoria (não apenas uma implementação), o fluxo é:

```text
┌──────────────────────┐
│       REQUEST        │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│     UNDERSTAND       │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│    CLASSIFY TASK     │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│     SKILL ROUTER     │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│   RESEARCH ROUTER    │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│      RESEARCH        │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│       ANALYZE        │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│       IMPLEMENT      │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│   ADVERSARIAL TEST   │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│       VERIFY         │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│       REPORT         │
└──────────────────────┘
```

* **SKILL ROUTER** (`skills/meta/skill-router/`) — analisa a tarefa e seleciona
  quais skills ativar. Nem toda tarefa precisa de todas as skills.
* **RESEARCH ROUTER** (`skills/meta/research-router/`) — decide **onde** pesquisar
  com base no tipo de problema.
* **ADVERSARIAL TEST** — testa a implementação como um usuário adversarial
  (repeat, reverse, replay, concurrent). Ver `adversarial-review`.

---

## 5. Síntese de pesquisa

O agente **nunca** deve retornar apenas uma lista de links. Toda pesquisa deve
ser sintetizada no formato:

```markdown
## Research

### Reference
[Name]

### Relevant Pattern
O que foi encontrado.

### Why It Matters
Por que este padrão é útil.

### Adaptation
Como ele poderia se aplicar ao projeto atual.

### Trade-offs
Que problemas ele introduz.

### Recommendation
O que deve de fato ser adotado.
```

---

## 6. Evitar overengineering

O sistema deve evitar:

* pesquisar tudo sempre;
* executar todas as skills;
* produzir relatórios gigantes;
* consultar referências irrelevantes;
* transformar qualquer comportamento estranho em bug;
* adicionar dependências desnecessárias.

Princípio:

> **Research proportional to uncertainty and impact.**

Quanto maior:

```text
uncertainty  +  impact  +  irreversibility
```

maior deve ser o nível de pesquisa. Uma mudança trivial e reversível não justifica
uma auditoria completa; uma mudança em fluxo de pagamento, irreversível e de alto
impacto, justifica o workflow completo.

---

## 7. Composição entre skills

Skills devem trabalhar em conjunto. O `skill-router` define a composição, mas a
regra geral é: uma tarefa raramente ativa uma skill isolada.

Exemplos:

* `payment` → `business-logic-audit`, `idempotency-audit`, `race-condition-hunter`,
  `data-integrity-audit`, `error-flow-audit`, `authorization-audit`.
* `social reactions` → `gamification-audit`, `business-logic-audit`,
  `idempotency-audit`, `race-condition-hunter`, `api-abuse-audit`.

Ao combinar skills, **deduplicar findings**: quando duas skills apontam o mesmo
defeito, consolidar em um único finding com a análise combinada.

---

## 8. Referências rápidas

| Precisa de… | Onde |
|---|---|
| Formato de uma skill | `docs/skill-authoring.md` |
| Formato de uma referência | `docs/reference-authoring.md` |
| Filosofia e princípios | `docs/philosophy.md` |
| Integração do agente (workflows) | `docs/agent-integration.md` |
| Catálogo de referências | `references/*.yaml` |
| Template de relatório de auditoria | `templates/audit-report.md` |
| Template de bug report | `templates/bug-report.md` |
| Validação (lint de skills/refs) | `scripts/validate.py` |
