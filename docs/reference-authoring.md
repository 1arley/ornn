# Reference Authoring

Como adicionar fontes externas ao catálogo. As referências são centralizadas em
`references/` — nunca embutidas em skills — para que o `research-router` possa
despachar para elas e o `scripts/validate.py` possa validar o schema.

## Por que centralizado

Sites, projetos, produtos e documentações externas não ficam espalhados pelas skills.
Isto evita:

* URLs duplicadas e que apodrecem em múltiplas skills;
* skills que viram um dump de links em vez de raciocínio;
* inconsistência sobre quais fontes são confiáveis.

```text
skills/        como pensar
references/    onde pesquisar
```

## Arquivos

```text
references/
├── frontend.yaml
├── ux.yaml
├── engineering.yaml
├── security.yaml
├── product.yaml
└── research.yaml
```

Cada arquivo é uma lista YAML de entradas. Um arquivo por domínio.

## Schema de cada entrada

```yaml
- name: Example
  url: https://example.com
  type: methodology
  category: ux
  authority: established
  use_when:
    - reviewing usability
    - designing flows
  avoid_when:
    - unrelated backend task
  search_queries:
    - "example usability heuristics"
    - "example flow design patterns"
```

| Campo | Tipo | Valores |
|---|---|---|
| `name` | string | Nome reconhecível da fonte. |
| `url` | string | URL canônica. |
| `type` | enum | `methodology` \| `heuristic` \| `inspiration` \| `implementation` \| `discovery` |
| `category` | string | Domínio — corresponde ao arquivo (`frontend`, `ux`, `engineering`, `security`, `product`, `research`). |
| `authority` | enum | `established` \| `community` \| `vendor` \| `curated` (ver abaixo). |
| `use_when` | list[string] | Situações em que a fonte é relevante. |
| `avoid_when` | list[string] | Situações em que não é útil ou é misleading. |
| `search_queries` | list[string] | Queries prontas para alimentar busca. |

## Classes de conhecimento (`type`)

Não tratar todas as fontes como iguais. O `type` diz **que tipo de coisa** a fonte
oferece:

| `type` | O que é | Exemplo |
|---|---|---|
| `methodology` | Um método ou framework estruturado | Laws of UX |
| `heuristic` | Heurísticas e princípios aplicáveis | Impeccable |
| `inspiration` | Inspiração visual, não prescritiva | Dribbble |
| `implementation` | Código/padrões concretos de implementação | Animate UI |
| `discovery` | Ferramenta de descoberta de mais fontes | LazyWeb, Shoogle |

## Níveis de autoridade (`authority`)

Nem toda fonte tem o mesmo peso. O `authority` diz **quanto confiar**:

| `authority` | Significado |
|---|---|
| `established` | Autoridade reconhecida, padrão de fato, documentação oficial. Maior peso. |
| `vendor` | Documentação de um vendor/framework específico. Confiável dentro do seu domínio. |
| `community` | Sabedoria da comunidade, curadoria coletiva. Útil mas verificar. |
| `curated` | Coleção curada (galerias, agregadores). Inspiração; não prescritivo. |

Ao sintetizar pesquisa, fontes `established` e `vendor` pesam mais que `curated` e
`inspiration`. Ver `AGENTS.md` § 5 (síntese) e § 1 (distinguir inspiração de evidência).

## Regras

1. **Uma fonte, uma entrada.** Não duplicar URLs entre arquivos. Se uma fonte serve a
   múltiplos domínios, escolha o domínio primário e referencie-o do router.
2. **`search_queries` sempre preenchido.** O `research-router` e as research skills
   usam estas queries; entradas sem queries são inacionáveis.
3. **`use_when`/`avoid_when` específicos.** "Quando útil" genérico não ajuda o router a
   decidir entre fontes.
4. **Inspiração ≠ evidência.** Fontes `type: inspiration` ou `authority: curated`
   nunca justificam um finding técnico por si só.
5. **URLs canônicas.** Use a URL raiz ou a página mais estável, não um deep link que
   pode quebrar.

## Validação

```bash
python3 scripts/validate.py
```

O validator verifica, para cada `references/*.yaml`:

* YAML sintaticamente válido;
* cada entrada tem todos os sete campos;
* `type` e `authority` são enums válidos;
* `category` corresponde ao arquivo em que está;
* `url` é uma URL absoluta com esquema;
* `use_when`, `avoid_when`, `search_queries` são listas não-vazias.
