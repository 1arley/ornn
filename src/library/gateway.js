import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { basename, join, relative } from "node:path";
import { loadLibrary, resolveItem, resolveSkillSelection } from "./catalog.js";

const INTENT_ALIASES = [
  [/\b(refator(?:e|ar|ação)|refactor(?:ing)?)\b/giu, "implement production pattern codebase"],
  [/\b(backend|servidor)\b/giu, "backend api business rules"],
  [/\b(segurança|security)\b/giu, "security vulnerabilities authorization permission"],
  [/\b(autenticação|authentication|auth)\b/giu, "authentication authorization permissions ownership"],
  [/\b(api|endpoint)s?\b/giu, "api endpoint directly accessible input"],
  [/\b(acessibilidade|accessibility|a11y)\b/giu, "accessibility wcag keyboard screen reader"],
  [/\b(interface|tela|ui)\b/giu, "interface ux interaction"],
  [/\b(otimiz(?:e|ar|ação)|optimi[sz](?:e|ation))\b/giu, "performance implementation production guidance"],
  [/\b(query|consulta)\b/giu, "query database sql schema data integrity database constraints"],
  [/\b(revise|revisar|review|analise|analisar)\b/giu, "review audit"],
  [/\b(melhore|melhorar|improve)\b/giu, "review improve"],
];

function parseSimplePins(text) {
  const pins = {};
  let current = null;
  let list = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+#.*$/, "");
    const pin = line.match(/^\s{2}([a-z0-9-]+):\s*$/i);
    if (pin) { current = pin[1]; pins[current] = { include: [], exclude: [] }; list = null; continue; }
    const key = line.match(/^\s{4}(include|exclude):\s*$/);
    if (current && key) { list = key[1]; continue; }
    const item = line.match(/^\s{6}-\s+['"]?([^'"]+?)['"]?\s*$/);
    if (current && list && item) pins[current][list].push(item[1]);
  }
  return pins;
}

export function readProjectContext(projectRoot) {
  const candidates = [
    "PRODUCT.md", "DESIGN.md", ".ornn/context.md", ".ornn/project.md",
    ".ornn/preferences.md",
  ];
  const files = [];
  for (const name of candidates) {
    const path = join(projectRoot, name);
    if (!fs.existsSync(path)) continue;
    files.push({ name, path, content: fs.readFileSync(path, "utf8") });
  }
  let packageText = "";
  try { packageText = fs.readFileSync(join(projectRoot, "package.json"), "utf8"); } catch {}
  const signals = [];
  if (/react|next/i.test(packageText)) signals.push("react codebase interface");
  if (/express|fastify|nestjs|koa/i.test(packageText)) signals.push("backend api endpoint");
  if (/prisma|postgres|mysql|sqlite|sql/i.test(packageText)) signals.push("database sql schema persistent state");
  const projectText = files.map((file) => file.content.slice(0, 4000)).join("\n");
  if (/react|next\.js/i.test(projectText)) signals.push("react codebase interface");
  if (/backend|api|endpoint/i.test(projectText)) signals.push("backend api endpoint");
  if (/database|sql|schema|query/i.test(projectText)) signals.push("database sql schema persistent state");
  if (/accessibility|a11y|wcag|screen reader/i.test(projectText)) signals.push("accessibility wcag interface");
  if (/authentication|authorization|security|permission/i.test(projectText)) signals.push("security authorization permission");

  let pins = {};
  try { pins = parseSimplePins(fs.readFileSync(join(projectRoot, ".ornn", "pins.yaml"), "utf8")); } catch {}
  try {
    const legacy = JSON.parse(fs.readFileSync(join(projectRoot, ".ornn", "pins.json"), "utf8"));
    for (const command of legacy.commands || []) pins[command] = { include: [`command:${command}`], exclude: [] };
  } catch {}
  return { files, signals, pins };
}

export function normalizeIntent(request, context = { signals: [], pins: {} }) {
  const trimmed = request.trim().replace(/^\/ornn\s*/i, "");
  const first = trimmed.split(/\s+/)[0]?.toLowerCase() || "";
  const pin = context.pins?.[first] || null;
  let enriched = trimmed;
  for (const [pattern, replacement] of INTENT_ALIASES) enriched = enriched.replace(pattern, (match) => `${match} ${replacement}`);
  if (context.signals?.length) enriched += ` ${context.signals.join(" ")}`;
  return { request: trimmed, normalized: enriched, shortcut: pin ? first : null, pin };
}

function runRouter(root, task) {
  const result = spawnSync("python3", [join(root, "scripts", "router.py"), "--json", task], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr.trim() || "Deterministic router failed");
  return JSON.parse(result.stdout);
}

function skillName(id) { return id.split("/").pop(); }

function selectedFromShortcut(root, intent) {
  const explicit = intent.request.split(/\s+/)[0]?.toLowerCase();
  const command = explicit ? resolveItem(root, `command:${explicit}`) : null;
  const include = intent.pin?.include || [];
  const exclude = new Set((intent.pin?.exclude || []).map(skillName));
  const qualify = (selector) => {
    if (/^(skills?|patterns?|recipes?|collections?|commands?):/i.test(selector)) return selector;
    for (const type of ["command", "collection", "recipe", "skill"]) {
      if (resolveItem(root, `${type}:${selector}`)) return `${type}:${selector}`;
    }
    return selector;
  };
  const selectors = [...(command?.type === "command" ? [`command:${command.id}`] : []), ...include.map(qualify)];
  if (!selectors.length) return { command: null, skills: [], exclude };
  const skills = resolveSkillSelection(root, selectors).map(skillName).filter((name) => !exclude.has(name));
  return { command: command?.id || intent.shortcut, skills, exclude };
}

export function planKnowledge(root, request, { projectRoot = process.cwd() } = {}) {
  const context = readProjectContext(projectRoot);
  const intent = normalizeIntent(request, context);
  const routed = runRouter(root, intent.normalized);
  const shortcut = selectedFromShortcut(root, intent);
  const names = [];
  for (const name of [...shortcut.skills, ...routed.selected.map((entry) => entry.name)]) {
    if (!names.includes(name) && !shortcut.exclude.has(name)) names.push(name);
  }
  const library = loadLibrary(root);
  const skills = names.map((name) => resolveItem(root, `skill:${name}`)).filter(Boolean);
  const selectedNames = new Set(skills.map((item) => skillName(item.id)));
  const categories = new Set(skills.map((item) => item.id.split("/")[0]));
  const related = (item) => [...item.skills, ...item.recipes, ...item.collections].some((id) => selectedNames.has(skillName(id)));
  const recipes = library.filter((item) => item.type === "recipe" && related(item));
  const collections = library.filter((item) => item.type === "collection" && related(item));
  if (/\b(database|sql|schema|query)\b/i.test(intent.normalized)) categories.add("engineering");
  const referenceFiles = [...categories].map((category) => join(root, "references", `${category}.yaml`)).filter(fs.existsSync);
  const patterns = library.filter((item) => item.type === "pattern" && categories.has(item.id.split("/")[0]));
  const artifacts = [
    ...skills.map((item, index) => ({ type: "skill", id: item.id, path: item.path, role: index === 0 ? "primary" : "supporting" })),
    ...recipes.map((item) => ({ type: "recipe", id: item.id, path: item.path })),
    ...collections.map((item) => ({ type: "collection", id: item.id, path: item.path })),
    ...patterns.map((item) => ({ type: "pattern", id: item.id, path: item.path })),
    ...referenceFiles.map((path) => ({ type: "reference", id: basename(path, ".yaml"), path })),
  ];
  return {
    intent: { task: intent.request, normalized: intent.normalized, shortcut: shortcut.command, category: routed.dominant_category, risk: routed.risk },
    knowledge: { primary: skills.slice(0, 1).map((x) => x.id), supporting: skills.slice(1).map((x) => x.id), recipes: recipes.map((x) => x.id), collections: collections.map((x) => x.id), patterns: patterns.map((x) => x.id), references: referenceFiles.map((x) => basename(x, ".yaml")) },
    strategy: { load: artifacts.map((x) => `${x.type}:${x.id}`), avoid: [...shortcut.exclude] },
    project: { files: context.files.map((file) => relative(projectRoot, file.path)), signals: context.signals },
    debug: { candidates: routed.selected.concat(routed.near_misses), budget: routed.budget, justification: routed.justification },
    artifacts,
  };
}

export function loadKnowledgePlan(plan) {
  return plan.artifacts.map((artifact) => ({ ...artifact, content: fs.readFileSync(artifact.path, "utf8") }));
}
