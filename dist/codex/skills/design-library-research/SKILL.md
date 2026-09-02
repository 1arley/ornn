---
name: design-library-research
description: Teaches product-driven research across frontend libraries by mapping flows and states to comparable interaction, motion and accessibility candidates.
license: MIT
metadata:
  aes-category: frontend
  aes-priority: high
---

# Design Library Research

## Objective

Ensinar pesquisa de redesign, UI, UX, animação e frontend orientada pelo produto:
entender fluxos reais, descobrir padrões e componentes em múltiplas fontes, comparar
candidatos e compor uma linguagem única antes de implementar. Esta skill faz
**research + component discovery + cross-library comparison + UI composition**; não
substitui as skills de review.

## Core Principle

Use esta unidade de investigação:

```text
produto → fluxo → interação → estado → componente → comportamento → motion → implementação
```

Nunca comece por `biblioteca → componente`. **Reference, not copy**: reutilize padrões
de interação, arquitetura, layout e transição, mas adapte cores, tipografia, spacing,
radius, sombras, ícones, conteúdo, branding e linguagem visual. Use o maior número de
componentes **bem escolhidos** possível, não o maior número de componentes possível.

## When to Use

Use antes de implementar criação ou reconstrução relevante de interface: redesign,
nova tela, modernização, navegação, tabs, cards, estados loading/empty/error,
responsividade, animações ou microinterações. Pesquisa explicitamente ampla usa nível
`full`; nos demais casos, cubra exaustivamente as categorias relevantes de forma
proporcional. Não use em tarefas backend, em revisão sem implementação, nem em uma
alteração visual trivial e já especificada.

Esta skill não implementa UI, não chama outras skills e não controla workflow. Uma
recipe pode recomendá-la antes de implementação e combinar reviews posteriores; o
agente consumidor decide a composição.

## Required Sources

Leia `references/frontend.yaml`, source of truth; não replique o catálogo. Para cada
fonte relevante, use documentação oficial → exemplos oficiais → repositório oficial
→ implementações GitHub → artigos. Consulte e classifique, sem tratá-las como
equivalentes:

| Fonte | Papel primário |
|---|---|
| Headless UI | primitive, behavior, accessibility |
| Motion | animation-system, transitions, layout, gestures |
| Animate UI | animated primitives and components |
| Magic UI | ready-made animated components/sections, sobretudo marketing |
| React Bits | creative interactions, reusable React components/effects |
| Hover | interaction, hover/motion patterns and ready-made sections |
| Aceternity UI | visual/animated components and effects |
| Pace UI | source-code components, blocks and templates |
| Eldora UI | animated React components/effects compatible with shadcn-style stacks |

Impeccable, Impeccable Slop e Interfaces são heurísticas, não fontes de implementação.
Em React, priorize compatibilidade React. Se uma boa referência for incompatível,
entenda o comportamento e reimplemente o equivalente na stack atual; nunca copie
código incompatível literalmente. Respeite licenças e restrições de redistribuição.

## Mental Model

Uma interface é um sistema de fluxos e máquinas de estado. Um componente só é um
candidato depois que uma necessidade real e sua localização no produto existem. Uma
boa escolha combina qualidade, relevância contextual, acessibilidade, custo técnico e
consistência sistêmica; beleza isolada não é fit.

## Phase 1 — Product Archaeology

Inspecione o produto antes das bibliotecas: routes, screens, layouts, shared e
interactive components, user flows, loading/empty/error/success states, navegação,
responsividade, animações, tokens de design, spacing, tipografia, cores e motion.
Produza um **Product Interaction Map** usando `templates/product-interaction-map.md`:

```yaml
product:
screens:
  - name:
    route:
    purpose:
    major_components: []
flows:
  - name:
    entry:
    steps: []
    exit:
interactive_surfaces:
  - name:
    screen:
    type:
    purpose:
    current_behavior:
```

## Phase 2 — Interaction Inventory

Para cada superfície, registre propósito, trigger e todos os estados aplicáveis:

```yaml
surface:
  name:
  location:
  purpose:
  trigger:
  states: [default, hover, focus, pressed, loading, selected, disabled, success, error, enter, exit]
  motion_opportunities: [state-transition, directional-movement, shared-layout, stagger, fade, slide, scale, spring, scroll-linked]
  accessibility:
    keyboard:
    focus:
    reduced_motion:
```

Para actions como reaction, bookmark, share, comment, reply, follow e notification
read, inclua pressed, optimistic, loading, success, failure e reversal. Para cards,
inclua hover, focus, pressed, selected, loading, reveal, metadata, bookmark/reaction e
navegação. Para tabs, inclua active indicator, movement, content enter/exit,
directionality, continuity, keyboard, focus, selected, reduced motion, interruption e
mobile.

## Phase 3 — Exhaustive Library Survey

Pesquise por necessidade de interface, não por nome da biblioteca. Uma homepage,
índice ou primeiro componente não conta como biblioteca pesquisada. Para cada fonte
relevante:

1. abra a documentação oficial e identifique categorias;
2. liste candidatos e abra a documentação de cada candidato relevante;
3. verifique API, estados, animação, comportamento, acessibilidade e responsividade;
4. verifique dependências, stack, licença, performance e limitações;
5. registre URL e por que cada candidato pode resolver a necessidade.

Exija cobertura exaustiva das categorias e componentes relevantes, não de toda a
internet. Use `templates/library-survey.md`. Exemplos: para tabs, pesquise primitives,
animated tabs, shared indicators e layout transitions; para entrada de feed,
animated lists, stagger, reveal e layout animation; para reação, buttons/toggles
stateful, feedback e reversal.

## Phase 4 — Cross-Library Candidate Matching

Para cada necessidade importante, levante múltiplos candidatos quando existirem e
registre ausência de alternativa quando não existirem. Compare em
`templates/component-matrix.md`:

| Critério | Peso |
|---|---:|
| UX fit | 5 |
| Interaction quality | 5 |
| Accessibility | 5 |
| Motion quality | 5 |
| Visual fit | 4 |
| Responsiveness | 4 |
| Customizability | 4 |
| Performance | 3 |
| Dependency cost | 2 |

A pontuação informa, mas não substitui julgamento documentado. Para primitivas
complexas (tabs, dialogs, menus, popovers, listboxes, navigation), prefira uma base
acessível como Headless UI quando ela oferecer comportamento superior e componha
visual/motion por cima.

## Phase 5 — Component-to-Flow Mapping

Nenhum candidato é aprovado sem localização, fluxo e razão:

```yaml
component:
source:
documentation:
product_location:
  screen:
  flow:
problem_solved:
states: [default, hover, focus, pressed, selected, loading, success, error]
motion:
reason_selected:
alternatives_considered: []
adaptation_required:
a11y_notes:
performance_notes:
```

Sem `product_location` → não aprovar. Sem user flow → não aprovar. Sem
`reason_selected` → não aprovar.

## Phase 6 — Think in Transitions, Not Components

Quando o usuário fala sobre trocar, abrir, fechar, navegar, selecionar, expandir,
recolher, adicionar ou remover algo, pesquise primeiro a **transição** e os estados,
não apenas o componente visual:

```text
tab → tab                    card → detail
feed → filtered-results     filter → result-set
notification → read         drawer/modal → open/close
comment → reply             bookmark → saved/unsaved
reaction → selected/unselected   search → results
pagination → next/previous  login → authenticated application
mobile navigation → section
```

Investigue active state, continuidade, direção, enter/exit, interrupção, teclado e
reduced motion. Não aceite troca instantânea por padrão; avalie primeiro se motion
funcional melhora orientação e, se não melhorar, mantenha a troca simples.

## Phase 7 — Design Composition

Produza um **UI Composition Plan**: `screen → flow → interaction → component →
animation → behavior`. Harmonize as escolhas em motion/duration/easing tokens e em
hover, focus, pressed, selected, enter/exit, cards, navigation, modal, loading e
feedback. Diversidade de fontes deve resultar em um único design system, não em uma
colagem de Magic UI, Aceternity, React Bits e Motion.

Diferencie motion funcional, feedback, navegação, continuidade, marca e decoração;
priorize os quatro primeiros. A meta é máximo de qualidade perceptível com mínimo de
ruído.

## Phase 8 — Avoid AI Slop

Faça revisão estética com Impeccable, Impeccable Slop e Interfaces quando disponíveis.
Questione gradientes, glow, glassmorphism, blur, floating elements, animações
permanentes, parallax e efeitos decorativos ou desconexos. Pergunta obrigatória:

> Se este efeito fosse removido, a compreensão, navegação, feedback ou percepção de
> estado pioraria?

Se não, considere remover. Um efeito pode permanecer por identidade de marca, mas a
decisão deve ser explícita e consistente.

## Phase 9 — Adaptation Handoff

Entregue uma recomendação aplicável ao agente executor: preserve arquitetura, tokens,
stack e os contratos opcionais `PRODUCT.md` e `DESIGN.md`; registre dependências,
licenças, performance, responsividade, touch e reduced motion. Não implemente como
efeito desta skill. Classifique cada candidato como `USE`, `ADAPT` ou `INSPIRE`.

## Phase 10 — Research Verification

Verifique se a pesquisa cobre os fluxos e cada estado inventariado, incluindo
repetição, reversão, interrupção, loading, falha e viewport móvel. Reviews e
implementação são responsabilidades separadas que recipes podem recomendar.

Accessibility participa da seleção e da revisão: keyboard navigation, focus
management, ARIA/semantics, screen reader, reduced motion, touch e mobile. Registre
correções e reexecute checks relevantes.

## Investigation Procedure

Execute as Phases 1–10 em ordem. A única redução permitida é de amplitude, de acordo
com impacto e incerteza; nunca pule arqueologia, comparação ou mapeamento em uma
tarefa que ativou esta skill. Se o pedido for pesquisa ampla, use `full`. Se uma fonte
estiver indisponível, registre tentativa, impacto de cobertura e alternativa oficial.

## Questions to Ask

* Qual fluxo e transição criam esta necessidade?
* Quais estados atuais, ausentes e de erro o usuário verá?
* Quais categorias relevantes foram realmente percorridas em cada fonte?
* Existem ao menos dois candidatos para cada necessidade importante?
* A primitiva é acessível por teclado, screen reader, touch e reduced motion?
* A escolha se encaixa na stack React e no design system atual?
* Motion comunica estado, feedback, direção ou continuidade?
* A composição parece um produto ou uma colagem de demos?

## Attack Patterns

```text
homepage-only     → abrir docs/categorias/candidatos e provar cobertura
beauty-first      → exigir product_location + flow + problem_solved
single-source     → procurar alternativas ou justificar exclusividade
state-skip        → percorrer default/hover/focus/pressed/loading/error
motion-noise      → remover efeito e testar se compreensão piora
stack-mismatch    → extrair padrão e reimplementar na stack atual
interrupt/reverse → agir novamente durante motion ou estado otimista
mobile/keyboard   → repetir fluxo sem hover e sem ponteiro
reduced-motion    → repetir fluxo com preferência de movimento reduzido
```

## Evidence Requirements

Uma pesquisa completa contém URLs oficiais dos candidatos, cobertura de categorias,
API/estado/comportamento/dependências observados, alternativas comparadas e ligação a
fluxos reais. Diferencie observação direta de inferência. Falha reproduzida pode ser
`CONFIRMED`; mecanismo estrutural localizado sem reprodução, no máximo `HIGH
CONFIDENCE`; lacuna parcial é `POSSIBLE`; palpite estético é `SPECULATIVE` e não
bloqueia implementação.

## False Positives

* Uma única fonte pode bastar quando não há alternativa real; documente a busca.
* Troca instantânea pode ser correta se motion não acrescenta compreensão.
* Ausência de hover em touch é normal; pressed/focus/semântica ainda importam.
* CSS simples pode superar uma dependência de motion em efeitos locais.
* Componente visualmente expressivo pode ser apropriado à marca; consistência e
  propósito decidem, não uma proibição universal de efeitos.

## Required Deliverables

Antes da implementação, produza:

1. Product Interaction Map — screens, flows, surfaces e states;
2. Library Survey — biblioteca, papel, categorias, candidatos, URLs e observações;
3. Candidate Matrix — need, component, source, alternatives, score e decisão;
4. Component-to-Flow Map — localização, fluxo, propósito, comportamento, motion,
   adaptação, acessibilidade e performance;
5. UI Composition Plan — screen → flow → interaction → component → animation → behavior;
6. Implementation Plan — arquivos, mudanças, ordem, dependências e verificação.

Use os templates em `templates/`. Um placeholder vazio não satisfaz o critério; a
cobertura deve ser derivada do produto consumidor, nunca incorporada à skill global.

## Failure Conditions

Marque a pesquisa como **incompleta** se componentes/categorias relevantes não foram
levantados; só uma biblioteca foi consultada sem justificativa; uma necessidade
importante tem um candidato apesar de alternativas; falta localização, fluxo ou
justificativa; estética foi o único critério; motion não tem função; accessibility ou
reduced motion não foram avaliados; ou implementação começou antes dos deliverables.

## Output Format

Entregue os seis artefatos de `Required Deliverables`, seguidos por decisão e síntese
no formato de pesquisa do `AGENTS.md` (Reference, Relevant Pattern, Why It Matters,
Adaptation, Trade-offs, Recommendation). Após implementar, anexe resultados das seis
reviews, findings deduplicados por evidência e itens N/A justificados. Pesquisa
incompleta deve declarar lacunas; não disfarce ausência de cobertura como decisão.
