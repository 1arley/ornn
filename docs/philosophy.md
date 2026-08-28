# Philosophy

> **Don't just review the code. Attack the assumptions behind the system.`

A filosofia deste repositório é que uma skill não é uma lista de comandos. É uma
**estrutura de raciocínio** que ensina o agente a descobrir problemas que ele não sabia
que deveria procurar.

---

## 1. Skills ensinam como pensar

Uma skill fornece:

* **modelo mental** — a lente através da qual enxergar o sistema;
* **perguntas** — o que questionar quando algo parece normal demais;
* **heurísticas** — atalhos de decisão baseados em padrões conhecidos;
* **padrões de ataque** — sequências concretas de operações que expõem defeitos;
* **processo de investigação** — a ordem em que investigar;
* **critérios de evidência** — o que conta como confirmação;
* **critérios de falso positivo** — quando um comportamento estranho é aceitável;
* **formato de saída** — como reportar de forma acionável.

Nenhuma skill deve depender de conhecimento implícito que não esteja documentado ou
disponível através das referências.

## 2. Referências ensinam onde olhar

Sites, projetos, produtos e documentações externas não ficam espalhados pelas skills.
Elas vivem em um catálogo centralizado em `references/`, classificadas por classe de
conhecimento e nível de autoridade.

```text
skills/        como pensar
knowledge/     o que considerar
references/    onde pesquisar
```

Isto mantém as skills focadas em raciocínio e evita que se tornem um dump de URLs.

## 3. Pesquisar antes de reinventar

Para tarefas não triviais, o agente pergunta:

> "Alguém já resolveu esse problema?"

E pesquisa, em ordem de confiabilidade:

1. código existente no projeto;
2. documentação oficial;
3. GitHub;
4. produtos reais;
5. design systems;
6. sites especializados;
7. artigos técnicos;
8. galerias de inspiração.

## 4. Referências não são especificações

O agente extrai princípios, padrões, decisões, trade-offs, soluções e problemas
conhecidos. Não copia cegamente código, layout, branding, identidade visual, conteúdo
ou componentes proprietários.

Inspiração, não cópia.

## 5. Evidência > especulação

Todo finding é classificado em um destes níveis:

```text
CONFIRMED         — reproduzido com evidência direta
HIGH CONFIDENCE   — forte indício técnico, sem reprodução completa
POSSIBLE          — plausível, exige mais investigação
SPECULATIVE       — hipótese sem evidência; risco a verificar, não bug
```

Nunca transformar uma hipótese em bug confirmado. Ver `AGENTS.md` § 2.

## 6. Evitar overengineering

```text
uncertainty  +  impact  +  irreversibility
```

quanto maiores, maior o nível de pesquisa. Pesquisa é proporcional à complexidade —
não é um ritual aplicado a tudo.

O sistema deve evitar: pesquisar tudo sempre, executar todas as skills, produzir
relatórios gigantes, consultar referências irrelevantes, transformar qualquer
comportamento estranho em bug, adicionar dependências desnecessárias.

## 7. Visão final

```text
                    AGENT
                      │
                      ↓
                SKILL ROUTER
                      │
          ┌───────────┼───────────┐
          ↓           ↓           ↓
       AUDIT       PRODUCT     FRONTEND
          │           │           │
          └───────────┼───────────┘
                      ↓
               RESEARCH ROUTER
                      │
        ┌─────────────┼─────────────┐
        ↓             ↓             ↓
      GitHub       Products      References
        │             │             │
        └─────────────┼─────────────┘
                      ↓
                  SYNTHESIS
                      │
                      ↓
                 IMPLEMENT
                      │
                      ↓
              ADVERSARIAL TEST
                      │
                      ↓
                   VERIFY
                      │
                      ↓
                   REPORT
```

O objetivo final não é criar um agente que **sabe mais**.
É criar um agente que **sabe como descobrir mais, onde procurar, quais perguntas fazer
e como verificar se está certo**.
