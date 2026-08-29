# Universal Installer

**Projeto:** Agent Engineering Skills  
**Status:** especificação definitiva da camada de distribuição  
**Objetivo:** tornar o projeto agnóstico de agente e oferecer instalação local, global, universal e específica por provider, com UX interativa e modo não interativo.

> Este documento substitui qualquer decisão anterior que trate Claude Code como destino padrão ou especial do projeto.

---

# 1. Princípio central

As skills pertencem ao projeto.

Claude Code, Codex, OpenCode, Cursor, Gemini CLI e outros agentes são apenas consumidores.

A arquitetura deve separar completamente:

```text
conteúdo das skills
!=
forma de instalação
```

O source canônico deve ser independente de provider.

```text
skills/
  audit/
  security/
  reliability/
  product/
  frontend/
  research/
  meta/
```

Nenhuma skill deve existir em versões duplicadas como:

```text
skills-claude/
skills-codex/
skills-opencode/
```

O fluxo correto é:

```text
Source Skills
    |
    v
Universal Installer
    |
    +--> Claude Code adapter
    +--> Codex adapter
    +--> OpenCode adapter
    +--> Cursor adapter
    +--> Gemini CLI adapter
    +--> Universal adapter
```

---

# 2. Resultado esperado

Executar:

```bash
npx ornn-forge install
```

em um terminal interativo deve abrir:

```text
Agent Engineering Skills

Detected agents:

  ✓ Claude Code
  ✓ Codex
  ✓ OpenCode
  ○ Cursor
  ○ Gemini CLI

Where do you want to install?

  ● Current project
  ○ Globally

Installation mode:

  ● Agent providers
  ○ Universal .agents/skills

Providers:

  ☑ Claude Code
  ☑ Codex
  ☑ OpenCode
  ☐ Cursor
  ☐ Gemini CLI

25 skills will be installed.

Continue? Y/n
```

Providers detectados começam selecionados.

Providers não detectados continuam disponíveis para seleção manual.

---

# 3. Objetivos

O instalador deve oferecer:

- instalação no projeto atual;
- instalação global;
- instalação universal em `.agents/skills`;
- instalação específica por agente;
- instalação em múltiplos agentes ao mesmo tempo;
- autodetecção de agentes;
- seleção interativa;
- modo totalmente não interativo;
- `--dry-run`;
- `--yes`;
- `update`;
- `uninstall`;
- `list`;
- `doctor`;
- manifesto de arquivos gerenciados;
- adapters independentes;
- segurança de filesystem;
- testes automatizados.

---

# 4. Não objetivos

Esta mudança não deve:

- duplicar skills por provider;
- transformar Claude Code em provider privilegiado;
- exigir dependências pesadas;
- modificar o source canônico durante instalação;
- remover arquivos que não foram instalados pelo pacote;
- assumir que provider detectado deve obrigatoriamente ser usado;
- quebrar compatibilidade com o padrão Agent Skills;
- remover suporte a instalação via ferramentas genéricas como `npx skills add`.

---

# 5. Source canônico

O source das skills deve continuar sendo:

```text
skills/<categoria>/<skill>/SKILL.md
```

Esse arquivo é a verdade.

Adapters recebem o source e produzem a representação necessária para o destino.

Quando um provider aceitar o formato original, nenhuma transformação deve acontecer.

Exemplo:

```text
skills/security/authorization-audit/SKILL.md
                 |
                 v
          provider adapter
                 |
         +-------+-------+
         |       |       |
         v       v       v
      Claude   Codex   OpenCode
```

---

# 6. Provider Registry

Criar uma única fonte de verdade para providers.

Estrutura sugerida:

```text
src/
  installer/
    providers.js
```

Modelo conceitual:

```js
{
  id: "claude",
  name: "Claude Code",

  detection: {
    commands: ["claude"],
    projectMarkers: [".claude"],
    globalMarkers: []
  },

  paths: {
    project: ".claude/skills",
    global: "<resolved-by-provider>"
  },

  adapter: "claude"
}
```

Providers iniciais:

```text
claude
codex
opencode
cursor
gemini
```

O registry deve permitir adicionar um novo provider sem alterar a lógica central de instalação.

---

# 7. Provider interface

Cada provider deve expor conceitualmente:

```text
id
name
detect()
resolveProjectPath()
resolveGlobalPath()
adaptSkill()
validateInstallation()
```

Quando não houver transformação:

```text
adaptSkill()
=
identity
```

A lógica de paths específicos não deve ficar espalhada pelo CLI.

---

# 8. Adapters

Criar:

```text
src/
  installer/
    adapters/
      universal.js
      claude.js
      codex.js
      opencode.js
      cursor.js
      gemini.js
```

## Regra

Adapter só transforma quando necessário.

Exemplo:

```text
Universal
  copy source

OpenCode
  copy source quando compatível

Codex
  copy source quando compatível

Claude
  adaptar somente campos realmente exigidos

Cursor
  adaptar somente se necessário

Gemini CLI
  adaptar somente se necessário
```

Nunca colocar lógica específica de provider dentro de uma função genérica como:

```text
adaptFrontmatter()
```

Se a transformação for específica do Claude:

```text
adaptForClaude()
```

---

# 9. Remover acoplamento atual ao Claude

Eliminar qualquer conceito equivalente a:

```text
DEFAULT_TARGET = ~/.claude/skills
```

como comportamento padrão do produto.

O comando sem argumentos deve abrir o instalador interativo.

Em ambiente não interativo, parâmetros suficientes serão obrigatórios.

Claude deve virar apenas:

```text
provider: claude
```

---

# 10. Escopos

Dois escopos oficiais:

```text
project
global
```

## Project

Instala no projeto atual.

Exemplos:

```text
.claude/skills/
.codex/skills/
.opencode/skills/
```

Os caminhos reais devem ser resolvidos pelo registry.

## Global

Instala no diretório global correspondente ao provider.

O usuário não deve precisar conhecer o path interno.

---

# 11. Universal mode

O projeto precisa de uma instalação que não pertença a nenhum agente.

Projeto:

```text
.agents/skills/
```

Global:

```text
~/.agents/skills/
```

Comandos:

```bash
npx ornn-forge install --scope project --universal
```

```bash
npx ornn-forge install --scope global --universal
```

Esse é o modo recomendado quando o usuário quer:

```text
instalar as skills no projeto
sem escolher Claude, Codex, OpenCode ou outro agente
```

---

# 12. CLI interativa

## Entrada

```bash
npx ornn-forge install
```

## Fluxo

### Passo 1

Detectar agentes.

```text
Detected agents:

  ✓ Claude Code
  ✓ Codex
  ✓ OpenCode
  ○ Cursor
  ○ Gemini CLI
```

### Passo 2

Escolher scope.

```text
Where do you want to install?

  ● Current project
  ○ Globally
```

### Passo 3

Escolher modo.

```text
Installation mode:

  ● Agent providers
  ○ Universal .agents/skills
```

### Passo 4

Se `Agent providers`:

```text
Providers:

  ☑ Claude Code
  ☑ Codex
  ☑ OpenCode
  ☐ Cursor
  ☐ Gemini CLI
```

### Passo 5

Mostrar plano.

```text
Installation plan

Scope:
  Current project

Project:
  /home/user/projects/my-api

Providers:
  Claude Code
  Codex
  OpenCode

Skills:
  24

Destinations:
  .claude/skills
  .codex/skills
  .opencode/skills

Will install:
  70

Will skip:
  2

Continue? Y/n
```

### Passo 6

Instalar.

```text
Installing Agent Engineering Skills

✓ Claude Code     .claude/skills        25 skills
✓ Codex           .codex/skills         25 skills
✓ OpenCode        .opencode/skills      25 skills

Done.

3 providers configured
75 skill installations
```

---

# 13. Controles do seletor

O seletor interativo deve suportar:

```text
↑ ↓     mover
space   selecionar
a       selecionar todos
enter   confirmar
```

Providers detectados começam marcados.

Nenhum provider detectado não deve bloquear a instalação.

Nesse caso oferecer:

```text
Universal .agents/skills
```

e seleção manual de providers.

---

# 14. CLI não interativa

Toda capacidade interativa deve possuir equivalente por flags.

## Instalação local

```bash
npx ornn-forge install --scope project
```

Se `--scope` for informado sem provider e o ambiente não for interativo, o CLI deve exigir `--providers` ou `--universal`.

## Global

```bash
npx ornn-forge install --scope global
```

## Provider único

```bash
npx ornn-forge install \
  --scope project \
  --providers opencode
```

## Múltiplos providers

```bash
npx ornn-forge install \
  --scope project \
  --providers claude,codex,opencode
```

## Detectados

```bash
npx ornn-forge install \
  --scope project \
  --providers detected
```

## Todos

```bash
npx ornn-forge install \
  --scope global \
  --providers all
```

## Universal

```bash
npx ornn-forge install \
  --scope project \
  --universal
```

## Sem confirmação

```bash
npx ornn-forge install \
  --scope project \
  --providers opencode \
  --yes
```

## Preview

```bash
npx ornn-forge install \
  --scope project \
  --providers detected \
  --dry-run
```

---

# 15. Flags oficiais

```text
--scope project|global

--providers <list|detected|all>

--universal

--yes

--dry-run

--force

--link

--target <path>
```

`--target` deve continuar existindo para uso avançado.

Ao usar `--target`, o usuário está explicitamente sobrescrevendo a resolução normal de destino.

---

# 16. Aliases

Aliases opcionais:

```text
-g    --global
-y    --yes
-p    --providers
```

Evitar criar muitos aliases.

A documentação principal deve preferir flags longas.

---

# 17. Compatibilidade retroativa

Se já existirem usuários usando:

```bash
npx ornn-forge install --target ...
```

esse fluxo deve continuar funcionando.

Se houver comportamento anterior:

```bash
npx ornn-forge install
```

instalando diretamente em Claude, a mudança deve ser documentada claramente no CHANGELOG.

Como o novo fluxo é interativo, essa quebra de UX é intencional.

---

# 18. Manifesto de instalação

Toda instalação gerenciada deve gerar manifesto.

Nome sugerido:

```text
.ornn-forge.json
```

Exemplo:

```json
{
  "schemaVersion": 1,
  "packageVersion": "1.1.0",
  "scope": "project",
  "mode": "providers",
  "providers": [
    "claude",
    "codex",
    "opencode"
  ],
  "skills": [
    "authorization-audit",
    "race-condition-hunter"
  ],
  "installations": [
    {
      "provider": "claude",
      "path": ".claude/skills",
      "files": []
    }
  ]
}
```

O manifesto precisa registrar os arquivos gerenciados.

Nunca assumir que todo arquivo dentro de uma pasta pertence ao pacote.

---

# 19. Update

Adicionar:

```bash
npx ornn-forge update
```

O update deve:

1. encontrar o manifesto;
2. recuperar scope;
3. recuperar providers;
4. recuperar modo;
5. comparar versão;
6. atualizar somente arquivos gerenciados;
7. preservar skills externas;
8. atualizar manifesto;
9. mostrar resumo.

Preview:

```bash
npx ornn-forge update --dry-run
```

Forçar:

```bash
npx ornn-forge update --force
```

---

# 20. Uninstall

Adicionar:

```bash
npx ornn-forge uninstall
```

Interativo:

```text
Remove Agent Engineering Skills from:

  ☑ Claude Code
  ☑ Codex
  ☑ OpenCode

24 managed skills will be removed.

Continue? y/N
```

O comando deve remover somente arquivos registrados no manifesto.

Nunca executar:

```text
rm -rf provider/skills
```

como estratégia genérica de uninstall.

Depois da remoção, diretórios vazios criados pelo pacote podem ser removidos com segurança.

---

# 21. List

Expandir:

```bash
npx ornn-forge list
```

Saída:

```text
Provider        Scope       Installed
Claude Code     project     24
Codex           project     24
OpenCode        project     24
Cursor          none         0
Gemini CLI      none         0
```

Também mostrar universal:

```text
Universal       project     24
```

quando aplicável.

---

# 22. Doctor

Expandir:

```bash
npx ornn-forge doctor
```

Exemplo:

```text
Agent Engineering Skills doctor

Environment

✓ Node 22
✓ Project detected

Providers

✓ Claude Code detected
✓ Codex detected
✓ OpenCode detected
○ Cursor not detected
○ Gemini CLI not detected

Installations

✓ Claude Code
  .claude/skills
  24/24 healthy

✓ Codex
  .codex/skills
  24/24 healthy

! OpenCode
  .opencode/skills
  23/24
  missing: authorization-audit
```

Doctor deve verificar:

```text
provider detection
manifest
missing files
unexpected version
broken symlinks
invalid target
permissions
corrupted installed skill
```

---

# 23. Link mode

Preservar suporte a desenvolvimento:

```bash
npx ornn-forge install \
  --scope project \
  --providers opencode \
  --link
```

ou:

```bash
npx ornn-forge link \
  --providers opencode
```

Symlinks precisam obedecer aos mesmos guardrails de paths.

Doctor deve detectar symlink quebrado.

---

# 24. Dry run

`--dry-run` deve usar a mesma lógica de resolução da instalação real.

Não pode existir um path resolver separado para preview.

Exemplo:

```text
Dry run

Scope:
  project

Providers:
  Claude Code
  OpenCode

Would create:
  .claude/skills/authorization-audit
  .opencode/skills/authorization-audit

Would overwrite:
  0

Would skip:
  2

No files changed.
```

---

# 25. Force

`--force` significa:

```text
substituir arquivos gerenciados conflitantes
```

e não:

```text
apagar recursivamente o destino e reconstruir
```

Quando possível, substituir somente:

```text
<target>/<skill>
```

após validar que o path pertence ao target esperado.

---

# 26. Segurança de filesystem

Antes de qualquer escrita ou remoção:

```text
resolve absolute path
normalize
validate containment
validate provider target
validate managed path
```

Nunca permitir remoção acidental de:

```text
/
home
project root
provider root
target pai
filesystem root
```

Rejeitar operações quando:

```text
dest == target
dest == projectRoot
dest == home
dest == filesystemRoot
```

Verificar symlinks antes de operações destrutivas.

---

# 27. Detecção de projeto

O CLI deve identificar o projeto atual sem depender apenas de `package.json`.

Sinais possíveis:

```text
.git
package.json
pyproject.toml
Cargo.toml
go.mod
pom.xml
build.gradle
```

Se estiver fora de um projeto e o usuário selecionar `project`, informar claramente.

Não criar silenciosamente `.agents` em um diretório arbitrário sem avisar.

---

# 28. TTY e CI

Se:

```text
stdin não é TTY
```

não abrir interface.

Com flags suficientes:

```text
executar
```

Sem flags suficientes:

```text
erro acionável
```

Exemplo:

```text
Interactive installation is unavailable in this environment.

Specify an installation target:

  --scope project --providers opencode --yes

or:

  --scope project --universal --yes
```

---

# 29. Exit codes

Definir contrato:

```text
0 success
1 general failure
2 invalid arguments
3 unsafe filesystem operation
4 provider resolution failure
5 partial installation failure
6 manifest error
```

Os códigos podem ser refinados, mas devem ser documentados e testados.

---

# 30. Output

Preferir output curto e legível.

Evitar logs internos por default.

Adicionar futuramente:

```text
--verbose
```

se houver necessidade real.

Não misturar warnings com success.

---

# 31. Estrutura sugerida

```text
src/
└── installer/
    ├── index.js
    ├── detect.js
    ├── install.js
    ├── update.js
    ├── uninstall.js
    ├── manifest.js
    ├── prompts.js
    ├── paths.js
    ├── safety.js
    ├── providers.js
    └── adapters/
        ├── universal.js
        ├── claude.js
        ├── codex.js
        ├── opencode.js
        ├── cursor.js
        └── gemini.js
```

O CLI deve coordenar.

A lógica real deve ficar nos módulos.

---

# 32. Testes obrigatórios

Adicionar cobertura para:

```text
provider detection
no provider detected
manual provider selection
project scope
global scope
universal project
universal global
single provider
multiple providers
providers detected
providers all
custom target
interactive defaults
non interactive mode
yes flag
dry run
force
link
adapter identity
adapter transformation
manifest creation
manifest update
manifest corruption
update
uninstall
partial uninstall
existing external skill
existing managed skill
unknown provider
unsafe path
filesystem root
home path
project root
symlink escape
broken symlink
provider validation
exit codes
```

---

# 33. Provider smoke tests

Para cada provider oficialmente suportado:

```text
install
discover
invoke
update
uninstall
```

Quando não for possível automatizar invoke, documentar smoke test manual reproduzível.

Status de compatibilidade:

```text
supported
tested
community-reported
untested
```

Não anunciar `supported` sem teste.

---

# 34. Universal Agent Skills compatibility

O source canônico deve continuar válido para ferramentas genéricas.

Manter compatibilidade com:

```bash
npx skills add 1arley/1arley-agent-skills
```

Essa rota não deve depender do CLI próprio.

O projeto deve possuir duas camadas independentes:

```text
Agent Skills standard
        |
        +--> ferramentas do ecossistema

Agent Engineering Skills CLI
        |
        +--> UX avançada
        +--> autodetecção
        +--> providers
        +--> scope
        +--> update
        +--> uninstall
        +--> doctor
```

---

# 35. README

A instalação principal deve virar:

```bash
npx ornn-forge install
```

Mostrar a interface:

```text
Agent Engineering Skills

Detected agents:

  ✓ Claude Code
  ✓ Codex
  ✓ OpenCode
  ○ Cursor
  ○ Gemini CLI

Where do you want to install?

  ● Current project
  ○ Globally

Installation mode:

  ● Agent providers
  ○ Universal .agents/skills

Providers:

  ☑ Claude Code
  ☑ Codex
  ☑ OpenCode
  ☐ Cursor
  ☐ Gemini CLI

25 skills will be installed.

Continue? Y/n
```

Depois documentar os atalhos.

## Projeto, universal

```bash
npx ornn-forge install \
  --scope project \
  --universal
```

## Projeto, OpenCode

```bash
npx ornn-forge install \
  --scope project \
  --providers opencode
```

## Global, detectados

```bash
npx ornn-forge install \
  --scope global \
  --providers detected
```

---

# 36. Posicionamento do projeto

Remover linguagem que defina o projeto como:

```text
skills para Claude Code
```

Preferir:

```text
Agent Engineering Skills for coding agents
```

ou:

```text
Evidence-driven engineering skills for coding agents.
```

Claude Code deve aparecer em:

```text
Supported providers
```

e não como identidade do produto.

---

# 37. Migração

A mudança do comportamento default precisa de documentação.

Antes:

```text
npx ornn-forge install
-> Claude Code
```

Depois:

```text
npx ornn-forge install
-> Universal Interactive Installer
```

Para reproduzir explicitamente instalação Claude:

```bash
npx ornn-forge install \
  --scope global \
  --providers claude
```

ou o scope correspondente ao comportamento anterior.

---

# 38. Versionamento

Essa mudança altera significativamente o comportamento do CLI.

Avaliar SemVer com base no contrato público atual.

Se o comando sem flags mudar de comportamento incompatível, considerar major version.

Se o projeto ainda considerar o fluxo anterior experimental, documentar a mudança claramente e justificar versão minor.

Não escolher versão apenas por estética.

---

# 39. Ordem de implementação

## Etapa 1

- provider registry;
- path resolver;
- adapters;
- universal adapter;
- remoção do default Claude.

## Etapa 2

- detecção;
- scope;
- providers;
- universal mode;
- flags não interativas.

## Etapa 3

- interface interativa;
- multi-select;
- confirmation plan.

## Etapa 4

- manifesto;
- update;
- uninstall.

## Etapa 5

- list;
- doctor;
- link integration.

## Etapa 6

- filesystem hardening;
- TTY behavior;
- exit codes.

## Etapa 7

- testes completos;
- provider smoke tests.

## Etapa 8

- README;
- CHANGELOG;
- compatibility docs;
- release.

---

# 40. Definition of Done

A feature só está concluída quando:

- [ ] `npx ornn-forge install` abre instalador interativo em TTY.
- [ ] Claude não é mais destino padrão.
- [ ] Providers são autodetectados.
- [ ] Providers detectados começam selecionados.
- [ ] Providers não detectados podem ser escolhidos manualmente.
- [ ] É possível escolher `project`.
- [ ] É possível escolher `global`.
- [ ] Existe instalação universal `.agents/skills`.
- [ ] É possível instalar em um provider.
- [ ] É possível instalar em múltiplos providers.
- [ ] `--providers detected` funciona.
- [ ] `--providers all` funciona.
- [ ] `--universal` funciona.
- [ ] `--scope` funciona.
- [ ] `--yes` funciona.
- [ ] `--dry-run` funciona.
- [ ] `--target` continua funcionando.
- [ ] `--link` continua funcionando.
- [ ] Adapters são independentes.
- [ ] Source canônico nunca é alterado.
- [ ] Manifesto é criado.
- [ ] `update` funciona.
- [ ] `uninstall` remove apenas arquivos gerenciados.
- [ ] `list` mostra instalações por provider.
- [ ] `doctor` verifica integridade.
- [ ] CI não tenta abrir prompts.
- [ ] Paths perigosos são bloqueados.
- [ ] Symlink escape é bloqueado.
- [ ] Testes do instalador passam.
- [ ] Smoke tests dos providers suportados passam.
- [ ] Compatibilidade com Agent Skills permanece.
- [ ] `npx skills add 1arley/1arley-agent-skills` continua possível.
- [ ] README não posiciona mais o projeto como Claude-only.
- [ ] CHANGELOG documenta a migração.

---

# 41. Resultado arquitetural final

```text
                         Agent Engineering Skills
                                   |
                            Canonical Skills
                                   |
                    Agent Skills compatible source
                                   |
                 +-----------------+-----------------+
                 |                                   |
                 v                                   v
        Generic Agent Skills CLI            AES Universal Installer
        npx skills add ...                  npx ornn-forge
                                                     |
                           +-------------------------+----------------------+
                           |             |            |          |          |
                           v             v            v          v          v
                        Claude         Codex       OpenCode    Cursor    Gemini
                           |
                           +-------------------------+
                                                     |
                                              Universal mode
                                             .agents/skills
```

O produto deixa de ser:

```text
Claude skills package
```

e passa a ser:

```text
Agent Engineering Skills platform
```

com distribuição multiplataforma e source agnóstico de agente.
