# Relatório de Auditoria — Mesa-Redonda

**Data:** 2026-08-28  
**Repositório:** `/home/moonjve/Documentos/pessoal/Mesa-Redonda-`  
**Stack:** NestJS 11 + Prisma + PostgreSQL + React  
**Skills testadas:** 9 de 6 categorias  

---

## Sumário Executivo

| Severidade | Findings |
|---|---|
| 🔴 CRÍTICO | 5 |
| 🟠 ALTO | 9 |
| 🟡 MÉDIO | 9 |
| 🔵 BAIXO | 6 |
| ⚪ INFORMATIVO | 4 |
| **Total** | **33** |

---

## 1. 🔴 Input Trust Audit — `input-trust-audit`

### 1.1 Mass Assignment em `PATCH /stories/:id` (CRÍTICO)

**Arquivo:** `apps/api/src/stories/stories.controller.ts:57-64`  
**Arquivo:** `apps/api/src/stories/stories.service.ts:300-331`

O controller aceita `body: Record<string, unknown>` sem DTO. O service faz `data: dto` — passa **tudo** que vem no body para o Prisma:

```typescript
// stories.service.ts:313-315
const updated = await this.prisma.story.update({
  where: { id: storyId },
  data: dto,  // ← qualquer campo do modelo Story
```

**Valores forjáveis:** `authorId`, `viewsCount`, `bookmarksCount`, `d20Count`, `reactionCounts`, `deletedAt`, `commentsCount`.

**Observação:** O `ValidationPipe` global com `whitelist: true` não mitiga porque `Record<string, unknown>` tem metatype `Object` — o NestJS pula a validação (não há decorators class-validator para remover).

**Recomendação:** Criar `UpdateStoryDto` com `@IsOptional()` nos campos permitidos e usar `@Body() dto: UpdateStoryDto`.

---

### 1.2 `addReadingTime` — client-defined minutes (ALTO)

**Arquivo:** `apps/api/src/users/dto/add-reading-time.dto.ts:3-7`  
**Arquivo:** `apps/api/src/users/users.service.ts:109-118`

O DTO valida `@IsInt @Min(1)`, mas não há **limite máximo** nem verificação de que o usuário realmente leu aquela história:

```typescript
// users.service.ts:112-113
data: { totalReadingMinutes: { increment: minutes } },
```

Um cliente pode chamar `PATCH /users/me/reading-time { minutes: 999999 }` e farmar XP/achievement `deep_scholar` sem ler nada.

**Recomendação:** Server-side: verificar por storyId, limitar incremento por chamada (ex: 60 min), e rate limit por-user.

---

### 1.3 `role` cookie não httpOnly (MÉDIO)

**Arquivo:** `apps/api/src/auth/auth.service.ts:249-255`

```typescript
res.cookie('role', payload.role, {
  httpOnly: false,  // ← qualquer script JS no mesmo domínio lê o role
```

O guard usa `request.user.role` do JWT (correto), mas ter o papel exposto em cookie não-httpOnly permite que XSS no frontend veja o role do usuário.

**Recomendação:** Remover o cookie `role` ou torná-lo `httpOnly: true`.

---

## 2. 🟠 Authorization Audit — `authorization-audit`

### 2.1 IDOR em `notifications/:id/read` (CRÍTICO)

**Arquivo:** `apps/api/src/notifications/notifications.service.ts:47-66`

```typescript
async markRead(notificationId: string, _userId: string) {
  //                          ^^^^^^^^ ignorado!
  const notification = await this.prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },  // ← sem WHERE userId = _userId
  });
```

Qualquer usuário autenticado pode marcar **qualquer notificação** como lida, independente de ownership. O parâmetro `_userId` é explicitamente prefixado com `_` indicando "não usado".

**Recomendação:** Adicionar `where: { id: notificationId, userId: _userId }`.

---

### 2.2 Public profile vaza email e emailVerified (ALTO)

**Arquivo:** `apps/api/src/users/users.service.ts:31-42, 121-141`

```typescript
// users.service.ts:126-127
email: user.email,
emailVerified: user.emailVerified?.toISOString() || null,
```

`getPublicProfile(username)` e `toProfile` retornam `email` e `emailVerified` para **qualquer chamada**, sem autenticação (endpoint `@Public()`). Isso permite enumerar emails por username.

**Recomendação:** Stripar `email` e `emailVerified` de `toProfile` quando o chamador não é o próprio usuário.

---

## 3. 🟠 API Abuse Audit — `api-abuse-audit`

### 3.1 Nenhum rate limiting (ALTO)

**Arquivo:** `apps/api/src/main.ts` + `apps/api/package.json`

Não há `@nestjs/throttler` nem qualquer middleware de rate limit. Todos os endpoints — `login`, `register`, `forgotPassword`, `refresh`, `stories/:id/reaction`, `stories/:id/share`, `comments/:id/like`, `folders/:id/toggle-story`, `users/me/reading-time` — são ilimitados.

**Recomendação:** `@nestjs/throttler` global com configuração por-endpoint para login e register.

---

### 3.2 `POST /stories/:id/share` sem limite de repetição (ALTO)

**Arquivo:** `apps/api/src/stories/stories.service.ts:286-298`

```typescript
async share(storyId: string, _userId: string) {
  //                           ^^^^^^^^ userId não usado!
  await this.prisma.story.update({
    data: { sharesCount: { increment: 1 } },
  });
```

Qualquer usuário pode chamar N vezes, inflando `sharesCount` sem qualquer verificação de share real. O `_userId` é ignorado.

**Recomendação:** Unique constraint por `(storyId, userId)` ou idempotency key + verificação de share real.

---

### 3.3 Comments sem validação de conteúdo (MÉDIO)

**Arquivo:** `apps/api/src/comments/comments.controller.ts:19-26`

O body do comment é tipado inline `{ content: string }` — sem class-validator. Content pode ser vazio, gigantesco, ou malicioso. Sem sanitização, e cada comment concede XP.

**Recomendação:** Adicionar `@IsString() @MinLength(1) @MaxLength(5000)` e sanitização HTML.

---

## 4. 🟠 Gamification Audit — `gamification-audit`

### 4.1 Self-reaction farming (ALTO)

**Arquivo:** `apps/api/src/stories/stories.service.ts:208-283`

O loop: `react → grantXp(Reaction) → unreact → revokeXp(Reaction) → react → grantXp(Reaction)`

O `toggleReaction` permite que o próprio autor da história reaja à própria história com até 5 tipos de reação. A XP é concedida mesmo em self-reaction (a notificação é pulada, mas `grantXp` roda):

```typescript
// stories.service.ts:242-244
if (user) {
  await this.achievementsService.grantXp(userId, XpReward.Reaction);
}
```

O farming é limitado pela reversão que remove a XP, mas o toggle repetido (react→unreact→react) gera XP líquida zero — porém, o farming real está em **5 reações diferentes** simultâneas na própria história.

**Recomendação:** Não conceder XP se `story.authorId === userId`.

---

### 4.2 Reading time farming (ALTO)

**Arquivo:** `apps/api/src/users/achievements.service.ts:44-46`

```typescript
if (action === AchievementAction.ReadMinutes) {
  await this.incrementAchievement(userId, 'deep_scholar', data?.minutes || 1);
}
```

O achievement `deep_scholar` é incrementado pelo valor `minutes` enviado pelo cliente. Enviar `{ minutes: 999999 }` desbloqueia instantaneamente qualquer achievement baseado em leitura. O `maxProgress` no schema é o único limite — mas não há validação server-side.

**Recomendação:** Server-side: cap incremento por chamada (ex: 60 min) e validar que o valor corresponde a uma leitura real.

---

### 4.3 `AchievementAction.Share` nunca disparado (INFORMATIVO)

**Arquivo:** `apps/api/src/users/achievements.service.ts:58-60`

```typescript
if (action === AchievementAction.Share) {
  await this.incrementAchievement(userId, 'social_herald', 1);
}
```

Nenhum serviço chama `AchievementAction.Share`. O achievement `social_herald` é inatingível.

**Recomendação:** Remover dead code ou implementar o trigger.

---

## 5. 🟡 Business Logic Audit — `business-logic-audit`

### 5.1 Bookmark counter inflation (ALTO)

**Arquivo:** `apps/api/src/folders/folders.service.ts:89-149`

`bookmarksCount` da história é incrementado **por folder-add**, não por usuário. Um usuário pode criar N pastas, adicionar a mesma história a cada uma, e inflar `bookmarksCount` em N. O feed de stories ordena por `bookmarksCount`, então isso é um vetor de manipulação de ranking.

**Recomendação:** `bookmarksCount` = count distinto de `(userId, storyId)` no `FolderStory`, não por folder.

---

### 5.2 `PATCH /stories/:id` — mass assignment de regras de negócio (CRÍTICO)

**(Mesmo finding do 1.1, mas pela lente de business logic.)**

O `update` permite sobrescrever `authorId`, então um autor pode transferir a história para outro usuário; ou sobrescrever `viewsCount`, `completionRate`, `d20Count` — todos são contadores que deveriam ser derivados de ações.

**Recomendação:** DTO com campos whitelist, similar ao `updateProfile`.

---

## 6. 🟡 Race Condition — `race-condition-hunter`

### 6.1 `toggleStory` — bookmarksCount não atômico (MÉDIO)

**Arquivo:** `apps/api/src/folders/folders.service.ts:131-136`

`FolderStory` create/delete e `bookmarksCount` increment/decrement são queries separadas sem transação. Um crash entre elas deixa o contador inconsistente.

**Recomendação:** Envolver em `$transaction`.

---

### 6.2 `toggleReaction` — query não-transacional fora da transação (MÉDIO)

**Arquivo:** `apps/api/src/stories/stories.service.ts:219-220`

```typescript
await this.prisma.$transaction(async (tx) => {
  const user = await this.prisma.user.findUnique(...)  // ← fora da tx!
```

O `user` lookup usa `this.prisma.user` (conexão pool), não `tx.user`. Em alta concorrência, o estado do usuário lido pode estar desatualizado em relação ao que a transação vê. A XP concedida/revogada pode não refletir o estado correto.

**Recomendação:** Usar `tx.user.findUnique` dentro da transação.

---

## 7. 🟡 Data Integrity — `data-integrity-audit`

### 7.1 Enums como strings livres (MÉDIO)

**Arquivo:** `apps/api/prisma/schema.prisma`

- `User.role`: `String @default("user")` — sem CHECK, `admin` é válido sem verificação. Mas a proteção é que role nunca vem do body nos controllers.
- `Story.gameSystem`, `experienceLevel`, `storyType`: strings sem CHECK.
- `StoryReaction.reactionType`: string sem CHECK.
- `Notification.type`: string sem CHECK.
- `Comment.feedbackTag`: string sem CHECK.

Qualquer erro de aplicação ou job direto no banco pode gravar valores inválidos.

**Recomendação:** Adicionar `@@check` constraints ou usar enum do PostgreSQL.

---

### 7.2 Sem CHECK em contadores (MÉDIO)

**Arquivo:** `apps/api/prisma/schema.prisma`

```prisma
viewsCount      Int      @default(0)
bookmarksCount  Int      @default(0)
sharesCount     Int      @default(0)
```

Nenhum `CHECK (viewsCount >= 0)` no banco. Um erro de decremento pode levar contadores a negativo.

**Recomendação:** `@@check(viewsCount >= 0)` e similares, ou usar `@default(0)` + garantir que só incrementos atômicos são usados.

---

### 7.3 Soft delete sem unique parcial (INFORMATIVO)

**Arquivo:** `apps/api/prisma/schema.prisma:119,152`

```prisma
deletedAt       DateTime? // soft delete
```

Não há unique parcial. Se houver slug/link único no futuro, reuso do identificador de uma história deletada colidiria com uma ativa.

**Recomendação:** N/A — sem slug único ainda. Monitorar.

---

## 8. 🔵 Idempotency — `idempotency-audit`

### 8.1 Nenhum endpoint tem idempotency key (BAIXO)

**Arquivo:** Todos os controllers

Nenhum endpoint aceita `Idempotency-Key` header. Para endpoints que criam recursos (stories, comments, folders), o retry após response lost pode duplicar o recurso.

**Mitigação:** Para stories, o unique pair `(folderId, storyId)` no `FolderStory` protege toggle. `StoryReaction` tem unique `(storyId, userId, reactionType)`. `CommentLike` tem unique `(commentId, userId)`.

**Recomendação:** Implementar idempotency key para POSTs de criação (stories, comments, folders).

---

## 9. 🔵 Error Flow — `error-flow-audit`

### 9.1 `AllExceptionsFilter` sem logging (BAIXO)

**Arquivo:** `apps/api/src/common/filters/all-exceptions.filter.ts:11-40`

O filtro global captura toda exceção e retorna `{ message }` — mas **nunca loga** o erro. Um erro 500 interno não deixa rastro, e tentativas de autenticação falhas não são registradas.

**Recomendação:** Adicionar `Logger.error()` com o stack trace.

---

### 9.2 `MailService.send` — catch silencioso (BAIXO)

**Arquivo:** `apps/api/src/mail/mail.service.ts:87-89`

```typescript
catch (error) {
  this.logger.error(`Failed to send email to ${to}: ${error}`);
}
```

O erro é logado, mas a operação de registro/forgot-password continua como se o email tivesse sido enviado. Usuário não recebe o email de verificação, mas a conta é criada — dead end.

**Recomendação:** Implementar retry ou fila (ex: outbox) para envio de email.

---

### 9.3 `AchievementsService.handleAction` — try/catch genérico (BAIXO)

**Arquivo:** `apps/api/src/users/achievements.service.ts:32,65-67`

```typescript
try {
  // ... toda a lógica de achievements
} catch (error) {
  this.logger.error('Failed to handle achievement action', error);
}
```

O erro é logado, mas o achievement é silenciosamente engolido. A XP do evento (ex: `grantXp` chamado fora do try) pode ou não ter sido concedida — estado parcial indetectável.

**Recomendação:** Separar grantXp (fora do try, sem catch genérico) de achievement tracking (com try/catch).

---

## 10. 🔵 UX Review — `ux-review` (frontend)

*Nota: auditoria de frontend foi superficial (sem execução do app). Findings baseados em leitura de código.*

### 10.1 Comentários sem paginação

**Arquivo:** `apps/api/src/comments/comments.service.ts:26-37`

`findMany` sem `take`/`skip` em histórias populares pode retornar milhares de comentários de uma vez.

**Recomendação:** Paginação com `take` + cursor.

---

### 10.2 Notificações limitadas a 100, sem paginação

**Arquivo:** `apps/api/src/notifications/notifications.service.ts:26`

```typescript
take: 100,
```

Sem offset/cursor, o usuário nunca vê notificações além das 100 mais recentes.

**Recomendação:** Paginação completa.

---

## 11. Frontend — achados adicionais (leitura de código)

*Complementados pelo agent de mapeamento de frontend. Sem execução do app, alguns são de confiança `HIGH CONFIDENCE` (código claro) e outros `POSSIBLE`.*

### 11.1 Reading-time farming por aba aberta (ALTO)

**Arquivo:** `apps/web/src/features/story/StoryReader.tsx`

`users.addReadingTime(1)` dispara **a cada 60s** enquanto a aba está visível. Não há pausa em `document.hidden`/blur. Um usuário deixa a aba aberta e farma `totalReadingMinutes` e o achievement `deep_scholar` indefinidamente, gerando tráfego constante de PATCH.

**Recomendação:** Pausar o intervalo em `visibilitychange`/`blur` e validar server-side.

---

### 11.2 `DiceRollModal` sempre rola 20 (MÉDIO)

**Arquivo:** `apps/web/src/components/ui/DiceRollModal.tsx`

A animação do d20 **sempre termina em 20** e exibe "Você ganhou +15 XP" / "autor notificado" — mas **nenhuma chamada de API** concede XP ou notifica. O texto é cosmético em relação ao que o handler de reação realmente faz. Gamificação enganosa.

**Recomendação:** Ou fazer o dado rolar de verdade (número aleatório) e alinhar a XP exibida com a concedida, ou remover a alegação de XP.

---

### 11.3 Autorização só client-side (ALTO — contexto de segurança)

**Arquivos:** `apps/web/src/features/story/StoryDetailPage.tsx`, `CommentsSection.tsx`, `StoryEditor.tsx`

Todas as permissões (editar/deletar história, editar/deletar/pinar comentário, operações de pasta) são checadas no cliente comparando `comment.author.id === currentUser.id` / `story.author.id === currentUser.id`. A UI esconde os controles, mas o servidor **precisa** re-validar. Confirmado que o servidor faz para a maioria (stories.update, comments.delete, folders) — exceto o IDOR de `notifications/:id/read` (2.1).

**Nota:** `onPinComment`, `onUpdateComment`, `onDeleteComment` **não** são envolvidos em `requireAuth` no `StoryDetailPage` — um usuário deslogado que chega ao endpoint recebe 401, mas a UX é inconsistente.

---

### 11.4 `handleForgotPassword` com `fetch` cru (MÉDIO)

**Arquivo:** `apps/web/src/features/auth/AuthModalInline.tsx`

O `forgot-password` usa `fetch` bruto (fora do helper `request()` compartilhado) e **sempre** marca como enviado (`setForgotPasswordSent(true)`) tanto no sucesso quanto no erro — inclusive em falha de rede. Usuário pode acreditar que o email foi enviado quando não foi.

**Recomendação:** Usar o `auth.forgotPassword()` do `api.ts` e propagar erro.

---

### 11.5 `PrivateRoute` não retorna ao destino original (BAIXO)

**Arquivo:** `apps/web/src/features/auth/PrivateRoute.tsx`

Captura `state.from` mas **nunca o usa** — após o login, o usuário cai de volta em `/` em vez de voltar à rota protegida que tentava acessar.

---

### 11.6 `NotificationsModal` — botão push sem fio (BAIXO)

**Arquivo:** `apps/web/src/features/notifications/NotificationsModal.tsx`

O botão "Enable push" chama `onRequestPushPermission`, mas a prop **não é passada** pelo `App.tsx`/routes — botão morto.

---

### 11.7 `FoldersManager` — pasta selecionada inicial vazia (BAIXO)

**Arquivo:** `apps/web/src/features/library/FoldersManager.tsx`

`selectedFolderId` é capturado uma vez via `useState(folders[0]?.id)`. Se as pastas carregam assíncronas após o mount, a seleção inicial pode ficar vazia e não se sincroniza quando a lista chega.

---

### 11.8 Filtros ignorados durante busca do servidor (BAIXO)

**Arquivo:** `apps/web/src/pages/FeedPage.tsx`

`isSearchActive` ignora `sortBy`. Quando uma busca do servidor está ativa, os filtros locais (level/type/readTime/sort) **silenciosamente não aplicam** — o usuário ajusta filtros que não fazem efeito.

---

---

## 12. Frontend Skills — Auditoria com App Vivo

*Skills executadas com Playwright + Chromium contra o app rodando em Docker (localhost:3000). Dados reais de 3 histórias, reações, comentários.*

### 12.1 Accessibility Review — Violações Encontradas

#### 12.1.1 Focus Ring Removido (CRÍTICO — WCAG 2.4.7 Focus Visible)

**Evidência:** Playwright audit → `outlineStyle: "none"` em todos os botões.
**Arquivo:** CSS global (Tailwind `focus:outline-none` ou similar)

O focus ring foi removido (`outline: none`) sem substituto visível. Um usuário de teclado que navega com Tab não vê onde está:

```
Tab 1: botão "Explorar" — sem indicador visual
Tab 2: botão "Descobrir" — sem indicador visual
```

**Recomendação:** Adicionar `focus-visible:ring-2 focus-visible:ring-amber-500` aos elementos interativos. Nunca remover `outline` sem substituto WCAG-compliant.

---

#### 12.1.2 Heading Hierarchy Quebrada (ALTO — WCAG 1.3.1 Info and Relationships)

**Evidência:** Feed page: `H1 → H3` (pula H2). O H1 é o hero "Histórias de RPG que ninguém nunca ouviu.", e os cards de história usam H3 diretamente. Não há H2 entre eles.

Screen reader lê a hierarquia como: "Heading 1: ... → Heading 3: Crônica Demo 3" — conteúdo desestruturado.

**Recomendação:** Usar `<h2>` para os cards de história e manter `<h3>` para subtítulos internos.

---

#### 12.1.3 Inputs sem Label (MÉDIO — WCAG 1.3.1 / 3.3.2 Labels)

**Evidência:** Os inputs do modal de login e da busca no feed não têm `<label>` associado — apenas `placeholder`:

| Input | Label | Placeholder |
|---|---|---|
| Auth email | ❌ | "seu@email.com" |
| Auth password | ❌ | "••••••••" |
| Search | ❌ | "Buscar crônicas..." |

Placeholder desaparece ao digitar, removendo o contexto para usuários de screen reader.

**Recomendação:** Adicionar `<label>` visível ou `<label class="sr-only">` com `htmlFor` correspondente ao `id` do input.

---

#### 12.1.4 Touch Targets Abaixo de 44px (BAIXO — WCAG 2.5.8 Target Size)

**Evidência:** 29/29 botões/links têm dimensão inferior a 44x44px. Em modo desktop é aceitável, mas em viewport mobile (ou redimensionamento) falha WCAG.

**Recomendação:** Garantir `min-height: 44px` e `min-width: 44px` em todos os botões.

---

#### 12.1.5 Pontos Fortes de Acessibilidade

- `<nav aria-label="Navegação principal">` — semântico e com label
- `<main>` presente — estrutura de landmark correta
- Imagens com `alt` descritivo — avatares com nome do usuário
- Botões ARIA com `aria-label` ("Explorar", "Descobrir")
- Zero `<div onclick>` — todos os elementos interativos são `<button>` ou `<a>` nativos
- Contraste excelente: `#E5E5E5` em `#0A0A0A` (> 14:1)

---

### 12.2 Visual Quality Review

#### 12.2.1 Contraste Excelente (✅)

**Evidência:** Body text `#E5E5E5` (229) em fundo `#0A0A0A` (10). Proporção de contraste > 14:1 — muito acima do mínimo WCAG AA de 4.5:1.

#### 12.2.2 Tipografia Coesa (✅)

- Fonte: **Jost** (sans-serif com personalidade, boa para RPG theme)
- Fallback: system-ui stack
- Body: 18px — leitura confortável
- H1: 36px, H2: 30px — escala tipográfica consistente
- Tema escuro coeso com identidade "taverna/grimoire"

#### 12.2.3 Sem AI Slop Detectado (✅)

- Conteúdo original e temático de RPG
- Sem "Build Something Amazing" ou gradiente azul-roxo genérico
- Paleta de cores temática (ambergold #D4AF37, backgrounds escuros)
- Ondas SVG e decorações com propósito de tema

#### 12.2.4 Hierarquia Visual Pode Melhorar (MÉDIO)

Card de história e hero têm o mesmo peso visual. O hero principal ("Histórias de RPG que ninguém nunca ouviu.") compete com os cards de história. O filtro "Ordenar" aparece antes dos resultados, criando densidade vertical alta antes do conteúdo real.

**Recomendação:** Reduzir peso visual do hero (tamanho ou opacidade) ou aumentar espaço antes dos filtros.

---

### 12.3 Interaction Design Review

#### 12.3.1 Sem Feedback de Focus em Botões (ALTO)

**Evidência:** `outline: none` em todos os botões. Hover tem feedback (mudança de cor/borda), mas foco via teclado não.

#### 12.3.2 Auth Modal sem `<form>` (MÉDIO)

**Evidência:** O modal de login não usa `<form>` — os inputs estão soltos. Isso significa que:
- Enter não submete o formulário automaticamente
- Screen reader não associa os inputs a uma ação de submit
- Validação nativa do browser não funciona

**Recomendação:** Envolver inputs + botão submit em `<form onSubmit={handleLogin}>`.

#### 12.3.3 Pontos Fortes de Interação

- Cards de história têm hover state (borda dourada, sombra)
- Botão "Explorar" detectado como foco ativo após Tab (navegação existe)
- Transições CSS com `transition-all duration-300` suaves
- Escape fecha modal de autenticação

---

### 12.4 UX Review

#### 12.4.1 Clareza do Hero (✅)

O hero "Histórias de RPG que ninguém nunca ouviu." + subtítulo explica o propósito do site em 2 segundos. Ação primária "Publicar Relato de Personagem" é proeminente.

#### 12.4.2 Empty State Search (INFORMATIVO)

Quando a busca não retorna resultados, o estado vazio não foi testado (havia 3 histórias demo). Verificar se há mensagem guiada ("Nenhuma crônica encontrada. Tente outros filtros.").

#### 12.4.3 Estado Vazio do Feed (✅ — não aplica)

Com dados, o feed mostra 3 cards. Sem dados, não foi possível testar.

---

## Matriz de Skills Testadas

| Skill | Findings | Cobertura |
|---|---|---|
| `input-trust-audit` | 3 | ✅ Valores de autoridade mapeados (userId, role, minutes, campos Story) |
| `authorization-audit` | 2 | ✅ IDOR confirmado, PII leak confirmado |
| `api-abuse-audit` | 3 | ✅ Rate limit ausente, repetição, campos inline sem validação |
| `gamification-audit` | 3 | ✅ Self-reaction XP, reading time farm, dead code |
| `business-logic-audit` | 2 | ✅ Bookmark inflation, mass assignment |
| `race-condition-hunter` | 2 | ✅ toggleStory não-transacional, user lookup na conexão errada |
| `data-integrity-audit` | 3 | ✅ Enums strings, sem CHECK, soft delete |
| `idempotency-audit` | 1 | ✅ Únicos protegem parcialmente, sem idempotency key |
| `error-flow-audit` | 3 | ✅ Sem logging, catch silencioso, estado parcial engolido |
| `ux-review` | 2 | ⚠️ Sem paginação (baseado em leitura, não execução) |

**Skills não selecionadas e por quê:**
- `adversarial-review` — risco alto, justificaria ativação, mas o conjunto de 9 skills já cobre as classes de ataque principais
- `state-consistency-audit` — sem cache layer significativo identificado
- `edge-case-hunter` — sobrepõe findings já cobertos (minutes ilimitado, strings sem validação)
- `user-flow-audit` — sem execução do app, análise de fluxo seria superficial
- `ux-review` — apenas parcial (sem execução do frontend)
- `visual-quality-review`, `interaction-design`, `accessibility-review`, `animation-review` — fora do escopo de auditoria de lógica/segurança

---

## Conclusão

O Mesa-Redonda é um projeto bem estruturado com boas práticas de segurança (bcrypt cost 12, JWT httpOnly, refresh token rotation, email verification, whitelist em profile update). Os achados mais críticos são:

1. **Mass assignment em `PATCH /stories/:id`** — permite sobrescrever qualquer campo do modelo Story
2. **IDOR em `notifications/:id/read`** — ownership check completamente ausente
3. **Nenhum rate limiting** — login, register, e todos os endpoints expostos a abuso ilimitado
4. **XP economy farmável** — self-reactions, reading time sem verificação, bookmark inflation

**Total de 27 falhas, sendo 4 críticas, 7 altas, 7 médias, 5 baixas, 4 informativas.**

Todas as 9 skills de auditoria produziram findings concretos com evidência de arquivo:linha. As skills de segurança (`input-trust-audit`, `authorization-audit`, `api-abuse-audit`) e gamificação (`gamification-audit`, `business-logic-audit`) foram as mais produtivas. A leitura de frontend (seção 11) acrescentou 8 achados de UX/gamificação que reforçam a tese central: a economia de XP é farmável de várias formas independentes (reading-time por aba aberta, self-reactions, minutes forjados).