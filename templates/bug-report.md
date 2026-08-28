# Bug Report Template

Template para relatórios de bugs individuais. Cada bug é um documento autônomo que pode
ser referenciado, anexado a uma issue, ou consolidado em um `audit-report.md` maior.

---

# Bug Report — <short title>

**Date:** <YYYY-MM-DD>
**Target version:** <version / commit / environment>
**Reported by:** <skill name(s) + methodology>

## Summary

<1-3 frases. O que está acontecendo e por que é um bug.>

## Severity

| Critical | High | Medium | Low |
|---|---|---|---|

## Confidence

| CONFIRMED | HIGH CONFIDENCE | POSSIBLE | SPECULATIVE |
|---|---|---|---|

*Ver `AGENTS.md` § 2 para a escala de evidência.*

## Affected component

<file(s) / module(s) / endpoint(s) / route(s) — ex: `src/app/api/checkout/route.ts`>

## Affected flow

<O fluxo que este bug afeta — ex: "fluxo de criação de pedido, etapa de cobrança">

## Reproduction

### Steps

1. `<passo 1>`
2. `<passo 2>`
3. `<passo 3>`

### Request/response

```http
<request exato — método, path, headers, body>
```

```http
<response observada>
```

### Environment

- **Browser:** Chrome 120 / Firefox 115 / Safari 17
- **Platform:** Mobile / Desktop / Tablet
- **Auth state:** Authenticated / Unauthenticated / Role: admin
- **Data state:** <estado prévio necessário: saldo, recursos, flags>

## Expected behavior

<O que deveria acontecer, segundo a especificação, regra de negócio, ou princípio.>

## Actual behavior

<O que de fato acontece — o comportamento incorreto.>

## Root cause

<O mecanismo — por que acontece, não só que acontece. Ex: "o handler não checa
ownership porque o middleware de authz não cobre esta rota", "o incremento é lido do
cache e reescrito sem atomicidade".>

## Impact

* **Blast radius:** <quantos usuários, recursos, transações?>
* **Data loss:** <sim / não / parcial — qual dado?>
* **Exploitability:** <trivial / médio / difícil — o que o atacante precisa?>

## Recommendation

```text
<Ação concreta. Onde e como corrigir. Ex: "Adicionar checagem de ownership no handler
DELETE /order/{id} antes de executar a deleção.">
```

## Evidence

<logs, screenshots, video, request/response adicional, ou "não reproduzido — apenas
análise de código".>

## False-positive check

*Por que isto NÃO é comportamento aceitável ou intencional:*

- <se já considerou: "talvez seja intencional porque..."> → <ruled out: documentação /
  regra de negócio / produto confirma>
- <se não consegue ruled out: baixar confiança para POSSIBLE e marcar como "precisa
  decisão de produto">

## References

<skills usadas, referências consultadas em `references/*.yaml`, links para código
relevante.>