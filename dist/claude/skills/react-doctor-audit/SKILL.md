---
name: react-doctor-audit
description: Scans a React/Next.js/React Native codebase with react-doctor to surface state-and-effects, performance, architecture, accessibility, and security anti-patterns, then verifies whether each is a real defect.
user_invocable: true
---


# React Doctor Audit

## Objective

Ensinar o agente a rodar `react-doctor` num codebase React e transformar cada
diagnóstico em finding verificado — distinguindo defeito real de padrão aceitável.
As regras do doctor são hipóteses; o agente confirma o mecanismo e o impacto.

## When to Use

* Em código React/Next.js/Vite/Astro/TanStack/React Native/Expo.
* Quando o pedido menciona "bad react", "react anti-pattern", "react performance",
  "react-compiler rules", "state and effects", "repeated jsx", "complex component".
* No audit/review de código React antes ou durante implementação.
* Ao escrever/refatorar componentes React e querer verificar regressão de padrões.
* **Composição:** roda com as frontend skills. Pareia com `accessibility-review`
  (regras a11y), `visual-quality-review` (extração de composição/JSX repetido) e
  `interaction-design`. Usa `reference-research` para comparar regras do doctor com
  docs oficiais (ver `references/frontend.yaml`, React Doctor).

## Mental Model

`react-doctor` é uma lente **determinística**: varre o codebase e aplica regras.
Não é opinião. O papel do agente é decidir, para cada regra que disparou, se é
defeito real **no contexto** — nuance que o scanner não entende. O scanner gera a
hipótese; o agente confirma.

Ataque à suposição: o doctor detecta o **sintoma** (complexidade, key errada, effect
desnecessário). A pergunta é a **causa** e o **impacto**. Sintoma ≠ bug. Um
`no-array-index-as-key` só é bug se a lista muda entre renders.

Eixos das regras (`react.doctor/docs`):

```text
state & effects  — hooks mal usados, deps, setState em loop, efeitos redundantes
performance      — memoização, reconciliação, array-index-as-key, renders repetidos
architecture     — componente complexo demais, JSX repetido, direito de composição
accessibility    — a11y (elemento interativo, aria, semântica)
security         — input não sanitizado, dangerouslySetInnerHTML
maintainability  — legibilidade e duplicação
```

Comando base:

```text
npx react-doctor@latest              # audita o codebase (root do projeto)
npx react-doctor@latest --format json    # saída máquina (agents/CI)
npx react-doctor@latest install      # instala a skill no agente (Claude/Cursor/Codex/OpenCode…)
npx react-doctor@latest ci install   # CI: roda em cada PR, só diffs novos
npx react-doctor@latest scan <url>   # trace de performance em runtime
```

## Investigation Procedure

1. **Rodar** — `npx react-doctor@latest` na raiz do projeto. Para agentes, usar
   `--format json`.
2. **Agrupar** — separar achados por categoria (state/effects, performance,
   architecture, accessibility, security, maintainability).
3. **Localizar** — para cada achado, achar o código exato (`file:line`).
4. **Confirmar mecanismo** — por que a regra disparou aqui? É defeito no contexto
   ou padrão intencional?
5. **Testar estado** — o que muda antes/depois de aplicar um fix mínimo? Ree-render?
   Efeito é idempotente?
6. **Re-rodar** — aplicar fix experimental e `--format json` de novo para ver se a
   regra deixa de disparar.
7. **Ignorar ruído** — regras que a config desliga em `doctor.config.ts`.
8. **Sintetizar** — produzir findings com localização, categoria, confidence.
9. **Component sourcing/fix** — ao refatorar, preferir extração de composição e
   primitivas acessíveis; adaptar ao design system, nunca copiar cego.

## Questions to Ask

* A regra que disparou aponta sintoma real ou falso positivo deste codebase?
* `no-array-index-as-key` — a lista é estática/imutável ou muda entre renders?
* Algum `useState`/`useEffect` com dependências faltando ou efeito redundante?
* Algum componente acima do limiar de complexidade que merecia composição?
* JSX repetido que devia virar componente reutilizável?
* `dangerouslySetInnerHTML` ou entrada de usuário sem sanitização?
* A definição de "problemático" do doctor bate com os invariantes deste projeto?

## Attack Patterns

* **repeat** — rodar `npx react-doctor@latest` duas vezes; a listagem deve ser
  determinística. Se muda, é bug no scanner, não no código.
* **skip/scope** — confirmar que o scan exclui `node_modules`, `dist`, build e
  código gerado; senão `react-doctor` vira ruído.
* **verify** — pegar um achado do doctor e conferir a regra no contexto antes de
  reportar. Um achado sem mecanismo é POSSIBLE, não CONFIRMED.
* **reverse** — aplicar o fix sugerido e re-rodar; se a regra continua, o diagnóstico
  estava incompleto.

## Evidence Requirements

* **CONFIRMED** — scanner reproduzido + localização `file:line` + mecanismo exato
  (por que é bug aqui) + impacto observado.
* **HIGH CONFIDENCE** — regra disparou + localização concreta + mecanismo plausível,
  sem run completo ou impacto observado.
* **POSSIBLE** — apenas a listagem do scanner, sem código localizado nem mecanismo.
* **SPECULATIVE** — não reportar.

O output do doctor é **evidência estrutural** (regra + localização), não confirmação
de defeito. Ele não prova que o padrão é bug no seu contexto; é o agente que prova.

## False Positives

* Regra que dispara, mas o codebase optou conscientemente pelo padrão (trade-off
  documentado, config).
* `no-array-index-as-key` quando a lista é estática ou as keys nunca se reordenam.
* "complex function" em componente deliberadamente monolítico ou legado congelado.
* Regra a11y que o projeto desliga por esforço/decisão (component headless, etc.).
* Não confundir **achado do scanner** com **bug**: scanner encontra, contexto decide.

## Output Format

Reaproveitar `templates/audit-report.md`. Cada finding deve incluir:

* `rule` — id da regra (ex.: `react-doctor/no-array-index-as-key`);
* `location` — `file:line`;
* `category` — `STATE_AND_EFFECTS | PERFORMANCE | ARCHITECTURE | ACCESSIBILITY | SECURITY`;
* `confidence` — escala de AGENTS.md § 2;
* `mechanism` — por que é defeito aqui;
* `impact` — o que quebra/perde;
* `fix` — correção minima.

Referenciar `references/frontend.yaml` (React Doctor) para comparar regras com a
documentação quando houver dúvida sobre a intenção de uma regra.
