# Skill Authoring

Skills are canonical, portable knowledge. They must remain useful when copied to a
compatible agent without Ornn tooling, project state, a router or an executor.
Composition and ordering belong in recipes; URLs belong in reference catalogs.

Como escrever uma skill. Toda skill segue um formato padrão para que o `skill-router`
possa despachar para ela, o `scripts/validate.py` possa verificá-la, e skills possam
compor entre si sem ambiguidade.

## Localização

```text
skills/<categoria>/<nome-da-skill>/SKILL.md
```

Categorias: `audit`, `security`, `reliability`, `product`, `frontend`, `research`,
`meta`. O nome da skill é kebab-case e corresponde exatamente ao `name` no frontmatter.

## Frontmatter

YAML, entre `---`:

```yaml
---
name: skill-name
description: Short description
category: audit
triggers:
  - trigger
  - another trigger
priority: high
---
```

| Campo | Tipo | Descrição |
|---|---|---|
| `name` | string | kebab-case, igual ao nome do diretório. |
| `description` | string | Descrição curta — usada para seleção. |
| `category` | string | Uma das categorias acima. |
| `triggers` | list[string] | Frases/tópicos que indicam quando a skill é relevante. O `skill-router` despacha com base nisto. |
| `priority` | enum | `low` \| `medium` \| `high`. Indica quão central é a skill para a categoria. |

## Corpo — nove seções fixas

Ordem obrigatória. Nenhuma seção pode ser omitida (use "N/A" com justificativa se
genuinamente não aplicável, mas prefira sempre preencher).

```markdown
# Skill Name

## Objective
O que esta skill ensina o agente a fazer. Uma frase.

## When to Use
Quando ativá-la. Condições, tipos de tarefa, sintomas. Corresponde aos `triggers`
expandidos em prosa.

## Mental Model
A lente de raciocínio. Como enxergar o sistema através desta skill.

## Investigation Procedure
A ordem das investigações. Passo a passo, sequencial.

## Questions to Ask
Perguntas concretas a fazer sobre o sistema. Cada uma expõe uma classe de defeito.

## Attack Patterns
Sequências concretas de operações que expõem defeitos. Verbs like repeat, reverse,
reorder, skip, replay, concurrent, manipulate.

## Evidence Requirements
O que conta como confirmação. Como reproduzir. Que nível de evidência é necessário
para subir o finding de POSSIBLE para CONFIRMED. Referencie a escala em AGENTS.md § 2.

## False Positives
Quando o comportamento "estranho" detectado é na verdade aceitável ou intencional.
O que NÃO reportar. Minimiza ruído.

## Output Format
Como reportar findings. Aponte para `templates/audit-report.md` e liste os campos
obrigatórios. Toda skill de auditoria deve produzir findings no formato padronizado.
```

## Qualidade — seis perguntas

Toda skill também deve responder (seção 21 do `plan.md`):

| Pergunta | Onde vive no SKILL.md |
|---|---|
| **Necessidade** — qual problema ela resolve? | `Objective` |
| **Escopo** — quando deve ser ativada? | `When to Use` + `triggers` |
| **Heurísticas** — quais perguntas ela ensina? | `Questions to Ask` + `Mental Model` |
| **Evidência** — como confirmar o finding? | `Evidence Requirements` |
| **Falsos positivos** — quando o comportamento é aceitável? | `False Positives` |
| **Composição** — quais skills trabalham junto? | `When to Use` (parágrafo final) ou seção dedicada |

Se uma skill não consegue responder às seis, ela não está pronta.

## Convenções de escrita

* **Termos estruturais em inglês** — nomes de skills, cabeçalhos das nove seções,
  campos de frontmatter, enums (CONFIRMED, etc.). Isto mantém compatibilidade com o
  router e o validator.
* **Prosa explicativa em português** — modelo mental, perguntas, procedimento. Isto
  segue a convenção do `plan.md`.
* **Diagrams em blocos de código `text`** — fluxos e pipelines ficam legíveis em
  terminal e não dependem de renderização.
* **Sem conhecimento implícito** — se a skill depende de um conceito, documente-o
  ou aponte para `references/`.

## Validação

```bash
python3 scripts/validate.py
```

O validator verifica:

* frontmatter com os cinco campos (`name`, `description`, `category`, `triggers`,
  `priority`);
* `name` igual ao nome do diretório;
* `category` válida;
* `priority` em `low`/`medium`/`high`;
* as nove seções presentes, em ordem, como headings `##`.

## Exemplo

Ver `skills/audit/adversarial-review/SKILL.md` para a skill de referência, e
`examples/` para auditorias completas.
