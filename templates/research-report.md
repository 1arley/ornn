# Research Report Template

Template para relatórios de pesquisa. Consolida a saída das research skills
(`reference-research`, `github-reference-research`, `market-research`,
`implementation-research`) em um documento único com síntese obrigatória — nunca apenas
uma lista de links (ver `AGENTS.md` § 5).

---

# Research Report — <question / feature / problem>

**Date:** <YYYY-MM-DD>
**Research question:** <a pergunta que guiou a pesquisa>
**Problem type:** <animation | ux | visual | architecture | security | engineering |
  product | implementation | discovery>
**Research level:** <none | proportional | full> *(proporcional a uncertainty +
impact + irreversibility — ver `AGENTS.md` § 6)*
**Skills used:** <ex: reference-research, github-reference-research, market-research>
**Router:** <research-router → qual despacho>

## Executive summary

<1-2 parágrafos. A resposta direta à research question, a recomendação principal, e o
nível de confiança geral.>

---

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

---

### Reference 2 — <name>

<repetir o bloco de síntese. Consolidar em um bloco quando múltiplas fontes dão a mesma
recomendação; citar as fontes no cabeçalho.>

---

## Convergence & divergence (para market research)

### Convergência (adotar)
- <onde os produtos/fontes concordam — padrão maduro>

### Divergência (avaliar)
- <onde divergem — espaço para diferenciação ou decisão>

---

## Sources & authority

| Source | Type | Authority | Used for |
|---|---|---|---|
| <name> | methodology \| heuristic \| inspiration \| implementation \| discovery | established \| vendor \| community \| curated | <o que se extraiu> |

> **Inspiração ≠ evidência** — fontes `type: inspiration` / `authority: curated`
> (ex: Dribbble, dark.design) calibram gosto, nunca justificam uma decisão técnica
> (ver `AGENTS.md` § 1).

## Confidence assessment

*Classifique a confiança da recomendação como um todo, não por fonte:*

| CONFIRMED | HIGH CONFIDENCE | POSSIBLE | SPECULATIVE |
|---|---|---|---|

- **O que confirmaria/subiria a confiança:** <ex: "protótipo com usuários reais",
  "teste de carga", "prova de conceito no contexto">
- **O que é incerto:** <ex: "padrão observado em 1 produto apenas", "benchmark de
  artigo de 2023">

## Out of scope / not researched

<O que não foi pesquisado e por quê (proporcionalidade, custo, irrelevância).>

## Next steps

<Próximas ações: prova de conceito, teste com usuários, protótipo, ou decisão de
implementação já tomada.>
