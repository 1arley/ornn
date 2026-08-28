# Example — Authorization Bypass (IDOR + Vertical Escalation)

*Demonstração concreta de uma auditoria de autorização. Ilustra:
`authorization-audit` + `api-abuse-audit` + `input-trust-audit`. Modelo: autenticado ≠
autorizado (ver `plan.md` §20).*

---

## Target

Um sistema com recursos de usuário (pedidos, documentos, perfil) e endpoints de
moderação (banir usuário, deletar post). Os endpoints exigem autenticação, mas a
autorização (ownership / role) é inconsistente.

## Hypotheses

```text
GET /resource/123

authenticated ≠ authorized
```

- **IDOR (horizontal):** usuário A acessa pedido de usuário B apenas trocando o ID.
- **Vertical escalation:** usuário comum chama endpoint de admin/moderator.
- **Role from client:** o payload do request contém `role` que o servidor confia.

---
## Finding 1 — IDOR: GET /order/{id}

### Reproduction

```http
POST /auth/login {email: "userA@example.com", password: "..."}
→ token: eyJ...
```

```http
GET /api/orders/1000  (pedido do userA)
Authorization: Bearer eyJ...
→ 200 { id: 1000, userId: "userA", items: [...], total: 250 }
```

```http
GET /api/orders/1001  (tentativa — pedido do userB)
Authorization: Bearer eyJ...
→ 200 { id: 1001, userId: "userB", items: [...], total: 500 }
```

**Resultado:** servidor retornou o pedido `1001` de outro usuário. A única checagem é
autenticação (token válido). **Não há checagem de ownership.**

### Root cause

```javascript
// router.get('/api/orders/:id', auth, async (req, res) => {
//   const order = await Order.findById(req.params.id);  // ← sem .where({ userId: ... })
//   res.json(order);
// });
```

O middleware `auth` só valida o token (quem é). O handler não adiciona
`req.user.id` ao filtro.

### Recommendation

```javascript
router.get('/api/orders/:id', auth, async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.id,
    userId: req.user.id,  // ← ownership check
  });
  if (!order) return res.status(403).json({ error: 'Forbidden' });
  res.json(order);
});
```

---
## Finding 2 — Vertical escalation: POST /admin/ban

### Reproduction

```http
POST /api/admin/ban
Authorization: Bearer eyJ... (token de user comum)
Content-Type: application/json

{ "userId": "userC", "reason": "spam" }
```

```http
→ 200 { ok: true }
```

**Resultado:** usuário comum banou outro usuário. Nenhuma checagem de `role` no
handler.

### Root cause

```javascript
// router.post('/api/admin/ban', auth, async (req, res) => {
//   await User.updateOne({ _id: req.body.userId }, { banned: true });
//   res.json({ ok: true });
// });
```

O middleware `auth` só valida o token. O prefixo `/admin` na rota é só convenção de
nomenclatura — não há middleware de RBAC separado.

### Recommendation

```javascript
// middleware de role
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  next();
};

router.post('/api/admin/ban', auth, requireRole('admin'), async (req, res) => {
  // ...
});
```

---
## Finding 3 — Role from client (mass assignment)

### Reproduction

```http
PUT /api/profile
Authorization: Bearer eyJ...
Content-Type: application/json

{ "bio": "new bio", "role": "admin" }
```

```http
→ 200 { bio: "new bio", role: "admin" }
```

**Resultado:** o campo `role` foi aceito do body e gravado.

### Root cause

```javascript
// router.put('/api/profile', auth, async (req, res) => {
//   const user = await User.findByIdAndUpdate(req.user.id, req.body, { new: true });
//   res.json(user);
// });
```

O bind de `req.body` é genérico. O modelo `User` tem o campo `role`, então o `$set`
aceita qualquer valor.

### Recommendation

```javascript
// Allowlist de campos atualizáveis
const ALLOWED_FIELDS = ['bio', 'displayName', 'avatar'];

router.put('/api/profile', auth, async (req, res) => {
  const updates = {};
  for (const field of ALLOWED_FIELDS) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }
  const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true });
  res.json(user);
});
```

---
## Summary

| # | Finding | Type | Severity | Confidence |
|---|---|---|---|---|
| 1 | IDOR horizontal — `GET /order/{id}` sem ownership check | authorization | Critical | CONFIRMED |
| 2 | Vertical escalation — `POST /admin/ban` sem role check | authorization | Critical | CONFIRMED |
| 3 | Mass assignment — `role` aceito do body | input-trust | High | CONFIRMED |

## Matriz de autorização

| Recurso × Ação | Papel exigido | Onde imposto | ✓/✗ |
|---|---|---|---|
| order × read | owner | middleware `auth` só | ✗ |
| order × delete | owner | middleware `auth` só | ✗ |
| order × update | owner | middleware `auth` só | ✗ |
| /admin/ban | admin | handler não checa | ✗ |
| /admin/delete-post | moderator/admin | handler não checa | ✗ |
| profile × update | owner | handler não checa role | ✓ (userId do token) |
| profile × role | N/A (nunca do body) | `req.body` direto → | ✗ |

*Ver skills: `authorization-audit`, `api-abuse-audit`, `input-trust-audit`.*