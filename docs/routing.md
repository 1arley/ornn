# Optional skill selection methodology

Routing is an optional discovery aid. `meta/skill-router` teaches agents to select a
small sufficient skill set using relevance, risk, overlap and cost. The deterministic
`scripts/router.py` and its evals remain available for reproducible recommendations.

Neither is a runtime dependency. Recipes provide compositions, collections provide
installable domains, and the consuming agent decides what to use.
