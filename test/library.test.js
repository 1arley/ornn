import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadKnowledgePlan, planKnowledge } from "../src/library/gateway.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CLI = join(ROOT, "bin", "cli.js");
const run = (args, cwd = ROOT) => spawnSync("node", [CLI, ...args], { cwd, encoding: "utf8" });

test("search spans skills, patterns, recipes and collections", () => {
  const result = run(["search", "animation"]);
  assert.equal(result.status, 0);
  for (const heading of ["SKILLS", "COLLECTIONS", "RECIPES"]) assert.match(result.stdout, new RegExp(heading));
  assert.match(result.stdout, /frontend\/animation-review/);
});

test("show exposes a pattern contract without executing it", () => {
  const result = run(["show", "frontend/animated-tabs"]);
  assert.equal(result.status, 0);
  for (const field of ["problem:", "states:", "motion:", "accessibility:", "references:"]) assert.match(result.stdout, new RegExp(field));
});

test("collection installation installs only selected canonical skills", () => {
  const target = mkdtempSync(join(tmpdir(), "ornn-collection-"));
  const project = mkdtempSync(join(tmpdir(), "ornn-project-"));
  try {
    const result = run(["install", "motion", "--destination", target, "--yes"], project);
    assert.equal(result.status, 0, result.stderr);
    const installed = readdirSync(target);
    assert.ok(installed.includes("animation-review"));
    assert.ok(!installed.includes("authorization-audit"));
  } finally {
    rmSync(target, { recursive: true, force: true });
    rmSync(project, { recursive: true, force: true });
  }
});

test("build derives multiple providers from the same source", () => {
  const result = run(["build", "--providers=generic,claude,codex", "--profile=full"]);
  assert.equal(result.status, 0, result.stderr);
  const source = readFileSync(join(ROOT, "skills", "frontend", "animation-review", "SKILL.md"), "utf8");
  const generic = readFileSync(join(ROOT, "dist", "generic", "skills", "animation-review", "SKILL.md"), "utf8");
  const codex = readFileSync(join(ROOT, "dist", "codex", "skills", "animation-review", "SKILL.md"), "utf8");
  assert.equal(generic, source);
  assert.equal(codex, source);
  assert.match(readFileSync(join(ROOT, "dist", "claude", "skills", "animation-review", "SKILL.md"), "utf8"), /user_invocable: true/);
});

test("every supported distribution derives the public ornn gateway", () => {
  const result = run(["build", "--providers=generic,claude,opencode,codex,cursor"]);
  assert.equal(result.status, 0, result.stderr);
  for (const provider of ["generic", "claude", "opencode", "codex", "cursor"]) {
    const gateway = join(ROOT, "dist", provider, "skills", "ornn", "SKILL.md");
    assert.ok(existsSync(gateway), `${provider} must include /ornn`);
    const manifest = JSON.parse(readFileSync(join(ROOT, "dist", provider, "manifest.json"), "utf8"));
    assert.equal(manifest.profile, "gateway");
    assert.deepEqual(manifest.skills.map((skill) => skill.name), ["ornn"]);
    assert.ok(manifest.skills.some((skill) => skill.name === "ornn"));
    assert.ok(existsSync(join(ROOT, "dist", provider, "skills", "ornn", "reference", "modules", "security", "security-audit.md")));
    assert.ok(existsSync(join(ROOT, "dist", provider, "skills", "ornn", "reference", "patterns", "frontend", "animated-tabs", "pattern.yaml")));
  }
});

test("detectors run without an API key and emit deterministic evidence", () => {
  const target = mkdtempSync(join(tmpdir(), "ornn-detector-"));
  try {
    writeFileSync(join(target, "sample.jsx"), "export const X = () => <img src=\"x.png\" />;\n");
    const result = run(["detect", target, "--json"]);
    assert.equal(result.status, 0);
    const data = JSON.parse(result.stdout);
    assert.ok(data.findings.some((finding) => finding.rule === "missing-alt"));
  } finally { rmSync(target, { recursive: true, force: true }); }
});

test("project context remains optional and outside canonical skills", () => {
  assert.ok(!existsSync(join(ROOT, "skills", "PRODUCT.md")));
  assert.ok(!existsSync(join(ROOT, "skills", "DESIGN.md")));
  assert.ok(existsSync(join(ROOT, "docs", "project-context.md")));
});

test("gateway discovers relevant knowledge from natural-language intent", () => {
  const cases = [
    ["refatore meu backend", /implementation-research|business-logic-audit/],
    ["revise a segurança dessa API", /security-audit|api-abuse-audit|authorization-audit/],
    ["melhore a acessibilidade dessa interface", /accessibility-review/],
    ["otimize essa query SQL", /data-integrity-audit|implementation-research/],
  ];
  for (const [request, expected] of cases) {
    const plan = planKnowledge(ROOT, request, { projectRoot: tmpdir() });
    assert.match([...plan.knowledge.primary, ...plan.knowledge.supporting].join(" "), expected, request);
  }
});

test("gateway plans metadata before lazily loading selected content", () => {
  const plan = planKnowledge(ROOT, "melhore a acessibilidade dessa interface", { projectRoot: tmpdir() });
  assert.ok(plan.artifacts.length > 0);
  assert.ok(plan.artifacts.every((artifact) => !("content" in artifact)));
  const loaded = loadKnowledgePlan(plan);
  assert.equal(loaded.length, plan.artifacts.length);
  assert.ok(loaded.every((artifact) => typeof artifact.content === "string" && artifact.content.length > 0));
});

test("explicit commands and natural intent share one knowledge-plan shape", () => {
  const explicit = planKnowledge(ROOT, "security", { projectRoot: tmpdir() });
  const natural = planKnowledge(ROOT, "revise a segurança dessa API", { projectRoot: tmpdir() });
  for (const plan of [explicit, natural]) {
    assert.deepEqual(Object.keys(plan).sort(), ["artifacts", "debug", "intent", "knowledge", "project", "strategy"]);
    assert.ok(plan.artifacts.some((artifact) => artifact.type === "skill"));
  }
  assert.equal(explicit.intent.shortcut, "security");
});

test("gateway reads optional project signals and configurable pins", () => {
  const project = mkdtempSync(join(tmpdir(), "ornn-context-"));
  try {
    mkdirSync(join(project, ".ornn"));
    writeFileSync(join(project, "package.json"), JSON.stringify({ dependencies: { react: "latest" } }));
    writeFileSync(join(project, ".ornn", "context.md"), "Consumer project context only.\n");
    writeFileSync(join(project, ".ornn", "pins.yaml"), "pins:\n  secure:\n    include:\n      - security\n    exclude:\n      - animation-review\n");
    const plan = planKnowledge(ROOT, "secure", { projectRoot: project });
    assert.equal(plan.intent.shortcut, "secure");
    assert.ok(plan.project.files.includes(".ornn/context.md"));
    assert.ok(plan.project.signals.some((signal) => signal.includes("react")));
    assert.ok(plan.artifacts.some((artifact) => artifact.type === "skill"));
    assert.ok(!plan.knowledge.supporting.some((id) => id.endsWith("animation-review")));
  } finally { rmSync(project, { recursive: true, force: true }); }
});

test("gateway keeps overlaps bounded by the deterministic risk budget", () => {
  const plan = planKnowledge(ROOT, "check authorization permissions ownership API replay concurrency", { projectRoot: tmpdir() });
  const selected = [...plan.knowledge.primary, ...plan.knowledge.supporting];
  assert.equal(new Set(selected).size, selected.length);
  assert.ok(selected.length <= plan.debug.budget.max);
});
