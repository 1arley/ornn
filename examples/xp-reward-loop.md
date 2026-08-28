# Example — XP Reward Loop Farming

*Demonstração concreta de uma auditoria de loop de recompensa. Ilustra:
`gamification-audit` + `business-logic-audit` + `idempotency-audit` +
`race-condition-hunter` + `api-abuse-audit`. Modelo: TRIGGER → CONDITION → REWARD →
REVERSAL (ver `plan.md` §20).*

---

## Target

Um sistema de reações sociais em que **reagir dá +10 XP** ao autor do conteúdo. O
usuário pode remover a reação (unreact).

## Hypothesis (gerada por adversarial-review)

```text
reaction
→ XP
→ remove reaction
→ reaction
→ XP
→ infinite farming
```

O farming acontece se a reversão (unreact) **não remove o XP concedido** — porque então
reagir de novo re-concede XP sobre um saldo que nunca voltou.

## Loop mapeado

```text
TRIGGER    → usuário reage a um post
CONDITION  → usuário não é o autor (self-reward bloqueado); usuário ainda não reagiu
REWARD     → autor do post recebe +10 XP
REVERSAL   → usuário remove a reação → autor perde os 10 XP?
```

## Investigação

### 1. O que acontece em `unreact`?

```http
POST /reactions/unreact {postId: 42}
```

**Resposta:** `200 OK`. O registro da reação é removido.

**Pergunta:** o XP concedido na reação é *devolvido*?

Rastreando o handler de unreact:

```javascript
// src/routes/reactions.js
router.post('/unreact', auth, async (req, res) => {
  const { postId } = req.body;
  const exists = await Reaction.findOne({ postId, userId: req.user.id });
  if (!exists) return res.status(404).json({ error: 'no reaction' });

  await Reaction.deleteOne({ postId, userId: req.user.id });
  // ⚠️ NENHUMA chamada para devolver XP ao autor
  res.json({ ok: true });
});
```

**Evidência:** `unreact` remove a reação mas **não** reverte o `+10 XP` dado ao autor
em `react`.

### 2. Confirmação — testar ACTION → REWARD → REVERSE → ACTION

| Ação | XP do autor |
|---|---|
| (estado inicial) | 0 |
| `react` | +10 → 10 |
| `unreact` | **10** (deveria ser 0 — a reversão não remove) |
| `react` (de novo) | +10 → **20** |

Reproduzido: o autor acumula XP indefinidamente alternando react/unreact sobre o
próprio conteúdo (ou sobre conteúdo de um parceiro).

### 3. Vetores adicionais

- **self-reward:** `react` ao *próprio* post é permitido? O handler de `react` checa
  `post.authorId !== req.user.id`? (Rastrear.)
- **concurrency:** dois `react` simultâneos — ambos passam na checagem "já reagiu?"
  (read-then-write) e concedem 2× o XP? (sem unique constraint → `race-condition-hunter`.)
- **replay:** `react` com a mesma combinação duas vezes — a checagem de existência
  impede? (idempotência.)

## Findings (resumo)

| # | Severity | Confidence | Finding |
|---|---|---|---|
| 1 | High | CONFIRMED | Farming infinito: `unreact` não reverte o XP; `react`+`unreact` repetidos acumulam XP sem limite |
| 2 | High | POSSIBLE | Self-reward possivelmente permitido (handler de `react` não checa `authorId` vs `userId`) |
| 3 | Medium | HIGH CONFIDENCE | Race no dedup de reação: sem unique constraint, dois `react` simultâneos concedem XP 2× |

## Causa raiz

A **REVERSAL do loop é incompleta**: a ação que concede XP (`react`) e a que deveria
removê-lo (`unreact`) não são transações acopladas. O XP é um efeito colateral do
`react` sem o inverso no `unreact`. Falta também a constraint que faz da reação
única por (user, post), e a checagem server-side de self-reward.

## Correção recomendada

1. **Reversão completa** — `unreact` deve executar a dedução dos 10 XP do autor, de
   forma atômica (mesma transação que remove a reação).
2. **Unique constraint** — `UNIQUE (user_id, post_id)` na tabela de reações. Impede
   reação duplicada (fecha race e replay).
3. **Self-reward server-side** — `react` rejeita quando `post.authorId === userId`.
   Não confiar na UI.

```sql
-- migração
ALTER TABLE reactions ADD CONSTRAINT uq_reaction UNIQUE (user_id, post_id);
CREATE OR REPLACE FUNCTION grant_xp(author_id INT, delta INT)
RETURNS void AS $$
  UPDATE users SET xp = GREATEST(xp + delta, 0) WHERE id = author_id;
$$ LANGUAGE sql;
```

*Ver skills: `gamification-audit`, `business-logic-audit`, `idempotency-audit`,
`race-condition-hunter`, `api-abuse-audit`, `adversarial-review`.*
