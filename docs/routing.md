# Gateway and internal routing

`/ornn` is the public semantic interface. `meta/skill-router` is internal discovery
infrastructure that selects a small sufficient skill set using relevance, risk,
required signals, overlap and cost. The deterministic `scripts/router.py` and its
evals remain available for reproducible recommendations and are reused by
`src/library/gateway.js`; there is no second ranking system.

The pipeline is `normalize intent → rank metadata → Knowledge Plan → lazy load`.
Explicit commands and pins enter through normalization as stronger signals and use
the same pipeline. None of these components is an agent runtime. Recipes provide
compositions, collections provide installable domains, and the consuming agent
decides what to use and performs execution.
