---
name: ornn
description: Universal public gateway that discovers and composes the minimum relevant Ornn knowledge for a natural-language task before the consuming agent executes it.
user_invocable: true
---


# Ornn Gateway

## Objective

Ser a única interface pública semântica do Ornn: receba `/ornn <tarefa>`, descubra
o menor conjunto suficiente de conhecimento e entregue esse contexto ao agente
consumidor. O Gateway não executa a tarefa, não controla ferramentas e não é runtime.

## When to Use

Use quando o usuário invocar `/ornn`, com linguagem natural ou shortcut. O usuário
não precisa conhecer skills, recipes, references, catálogo, resolver ou routers.
Pedidos triviais podem resultar em zero skills; pedidos compostos podem selecionar
mais de uma. Subcomandos e pins são sinais fortes para este mesmo pipeline, nunca um
sistema paralelo.

## Mental Model

```text
request + project context
        ↓
normalize intent (metadata only)
        ↓
catalog → internal skill-router → resolver
        ↓
Knowledge Plan
        ↓
load only selected files
        ↓
consuming agent reasons and executes
```

Conhecimento canônico vive no Ornn. Contexto específico vive em `PRODUCT.md`,
`DESIGN.md` ou `.ornn/`. Não copie contexto do projeto para a biblioteca.

## Investigation Procedure

1. Remova o prefixo `/ornn` e preserve a solicitação original.
2. Leia apenas metadata do catálogo e, quando existirem, sinais de `PRODUCT.md`,
   `DESIGN.md`, `.ornn/context.md`, `.ornn/project.md`, `.ornn/preferences.md` e
   `.ornn/pins.yaml`.
3. Normalize shortcut, pin e linguagem natural numa única intenção.
4. Use `catalog/skills.yaml` e o `skill-router` interno para rankear por triggers,
   required signals, prioridade, risco, custo, composição e overlap.
5. Resolva commands, collections e recipes pelo resolver existente; trate-os como
   composição declarativa, não execução.
6. Construa um Knowledge Plan com primary, supporting, references, load e avoid.
7. Só então leia os `SKILL.md`, recipes, patterns e catálogos de references listados.
8. Componha um contexto compacto, removendo orientação redundante.
9. Entregue o contexto ao agente consumidor, que decide, usa ferramentas e executa.
10. Mostre scores/candidatas/arquivos somente quando o usuário usar `--debug`.

Quando `src/library/gateway.js` estiver disponível, use `planKnowledge()` antes de
`loadKnowledgePlan()`. Em uma distribuição somente de skills, aplique o mesmo fluxo
lendo primeiro o catálogo disponível ou, como fallback, apenas frontmatter e nomes
das skills irmãs; nunca leia todas integralmente para decidir.

## Questions to Ask

* Qual resultado o usuário quer, independentemente dos nomes internos?
* Quais sinais vêm do pedido e quais vêm do projeto?
* Cada artefato selecionado adiciona uma lente ou capacidade distinta?
* Um required signal foi realmente observado ou apenas inferido?
* Um pin inclui ou exclui conhecimento explicitamente?
* O plano ainda é útil se o artefato de menor ganho marginal for removido?

## Attack Patterns

### Skill explosion

Um domínio amplo não autoriza carregar uma coleção inteira. Aplique budget, custo e
overlap e mantenha somente cobertura marginal real.

### Shortcut bypass

`/ornn security` não usa outro router: o shortcut apenas fortalece sinais e entra no
mesmo pipeline de normalização, seleção e lazy loading.

### Context contamination

Preferências do projeto ajustam ranking; não alteram a fonte canônica nem se tornam
memória global.

### Runtime creep

Se o Gateway começa a executar shell, controlar ferramentas, manter loop ou decidir
findings, pare. Essas responsabilidades pertencem ao agente consumidor.

## Evidence Requirements

Uma descoberta é rastreável quando o modo debug consegue informar intenção, contexto
detectado, candidatas e scores, selecionadas, rejeições por overlap/signal/custo e
arquivos efetivamente carregados. No modo normal exponha apenas o necessário para a
tarefa, sem despejar essa telemetria no usuário.

## False Positives

* Carregar todas as skills porque a solicitação é vaga.
* Tratar nome de categoria como prova suficiente sem trigger ou sinal.
* Ignorar `risk_floor`, `requires_signals` ou contexto negado.
* Duplicar relações do catálogo dentro desta skill.
* Transformar `composes_with` em dependência obrigatória.
* Confundir descoberta de conhecimento com execução da tarefa.
* Exigir que o usuário invoque `skill-router` ou saiba nomes internos.

## Output Format

Internamente, produza algo equivalente a:

```yaml
intent:
  task: "<pedido original>"
knowledge:
  primary: ["<artefato principal>"]
  supporting: ["<somente cobertura complementar>"]
  references: ["<catálogo relevante>"]
strategy:
  load: ["<arquivos selecionados>"]
  avoid: ["<exclusões e overlaps>"]
execution: consuming-agent
```

Não é obrigatório mostrar esse plano. Use-o para carregar contexto seletivamente e
depois deixe o agente consumidor realizar a solicitação original.
