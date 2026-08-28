# Example — Race Condition in Balance Checkout

*Demonstração concreta de uma auditoria de race condition. Ilustra:
`race-condition-hunter` + `business-logic-audit` + `idempotency-audit` +
`data-integrity-audit`. Modelo: READ → DECISION → WRITE (ver `plan.md` §20).*

---

## Target

Um sistema de checkout que verifica o saldo do usuário antes de debitar:

```text
READ    balance (≥ price?)
DECIDE  yes → proceed
WRITE   balance = balance - price
```

## Hypothesis

```text
check balance
→ two requests
→ both pass
→ both deduct
```

Dois requests simultâneos lêem o mesmo saldo, ambos decidem "ok", e ambos debitam —
resultando em saldo final menor que o permitido (ou negativo).

## Mapeamento da race

```javascript
// src/services/checkout.js
async function checkout(userId, price) {
  const user = await User.findById(userId);          // ← READ
  if (user.balance < price) throw new Error('...');  // ← DECISION
  user.balance -= price;                             // ← WRITE
  await user.save();
  await createOrder(userId, price);
}
```

**Janela:** entre o `findById` (READ) e o `save` (WRITE), outro request pode executar
o mesmo bloco, ler o mesmo saldo, e aprovar.

## Reprodução

Simular dois requests simultâneos contra `GET /checkout`:

| Request | Time | Ação |
|---|---|---|
| — | t0 | Saldo inicial: 100 |
| A | t1 | `findById` → balance=100 (≥ 50? yes) |
| B | t2 | `findById` → balance=100 (≥ 50? yes) ← mesma leitura, A ainda não salvou |
| A | t3 | `save` → balance=50 |
| B | t4 | `save` → balance=50 ← deveria ser 0, mas B usou a leitura de t2 |

**Resultado:** saldo final = 50 (em vez de 0). Duas compras de 50, mas o saldo só
reduziu uma vez. Se o preço fosse 60, o saldo ficaria -20 — estado impossível.

## Evidência

```javascript
// Reprodução conceitual — dois requests paralelos
const results = await Promise.all([
  checkout(userId, 50),  // request A
  checkout(userId, 50),  // request B
]);
// user.balance → 50, 2 orders created → saldo deveria ser 0
```

## Causa raiz

O código executa um padrão **read-then-write sem atomicidade**. O MongoDB `.save()`
substitui o documento inteiro — não é um `$inc` atômico — e não há `where` condicional
que impeça a escrita se o saldo mudou.

## Correção recomendada

### Opção 1 — Atômico (preferida)

```javascript
// Usa $inc atômico + condicional
const result = await User.findOneAndUpdate(
  { _id: userId, balance: { $gte: price } },  // ← CAS: balance >= price
  { $inc: { balance: -price } },               // ← atômico
  { new: true }
);
if (!result) throw new Error('Insufficient balance');
```

### Opção 2 — Transação

```javascript
const session = await mongoose.startSession();
session.startTransaction();
try {
  const user = await User.findById(userId).session(session);
  if (user.balance < price) throw new Error('...');
  user.balance -= price;
  await user.save({ session });
  await createOrder(userId, price, { session });
  await session.commitTransaction();
} catch {
  await session.abortTransaction();
}
```

**Nota:** transação sem `$inc` não fecha a janela de leitura se outro request lê antes
do commit. Opção 1 (CAS) é mais segura.

### Opção 3 — Unique constraint

Se o pedido (`orderId`) for a chave de idempotência, uma unique constraint impede
duplicação — mas não impede o *segundo* débito se o saldo foi lido antes do primeiro
commit. Opção 1 é a defesa correta.

## Checklist de aplicação

| Invariant | Defesa atual | Defesa recomendada | Prioridade |
|---|---|---|---|
| balance ≥ 0 | `save()` sem condicional | `$inc` + `$gte` (CAS) | Critical |
| saldo não negativo | nenhuma (sem CHECK) | `CHECK (balance >= 0)` no DB | High |
| order única | nenhuma | UNIQUE (order_id) | High |

*Ver skills: `race-condition-hunter`, `business-logic-audit`, `idempotency-audit`,
`data-integrity-audit`.*