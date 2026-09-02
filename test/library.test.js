import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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
  const result = run(["build", "--providers=generic,claude,codex"]);
  assert.equal(result.status, 0, result.stderr);
  const source = readFileSync(join(ROOT, "skills", "frontend", "animation-review", "SKILL.md"), "utf8");
  const generic = readFileSync(join(ROOT, "dist", "generic", "skills", "animation-review", "SKILL.md"), "utf8");
  const codex = readFileSync(join(ROOT, "dist", "codex", "skills", "animation-review", "SKILL.md"), "utf8");
  assert.equal(generic, source);
  assert.equal(codex, source);
  assert.match(readFileSync(join(ROOT, "dist", "claude", "skills", "animation-review", "SKILL.md"), "utf8"), /user_invocable: true/);
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
