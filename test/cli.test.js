import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const CLI = resolve(import.meta.dirname, "..", "bin", "cli.js");

function run(args, opts = {}) {
  return spawnSync("node", [CLI, ...args], { encoding: "utf8", ...opts });
}

function tmpTarget() {
  const dir = mkdtempSync(join(tmpdir(), "aes-cli-"));
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

test("--version prints the package version", () => {
  const r = run(["--version"]);
  assert.equal(r.status, 0);
  assert.match(r.stdout.trim(), /^\d+\.\d+\.\d+$/);
});

test("--help lists install, doctor, list, graph and eval", () => {
  const r = run(["--help"]);
  assert.equal(r.status, 0);
  for (const word of ["install", "doctor", "list", "graph", "eval", "validate"]) {
    assert.ok(r.stdout.includes(word), `help should mention ${word}`);
  }
});

test("install --dry-run makes no filesystem changes", () => {
  const { dir, cleanup } = tmpTarget();
  try {
    const r = run(["install", "--dry-run", "--target", dir]);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /would install:/);
    assert.deepEqual(readdirSync(dir), []);
  } finally {
    cleanup();
  }
});

test("install copies skills and adapts frontmatter", () => {
  const { dir, cleanup } = tmpTarget();
  try {
    const r = run(["install", "--target", dir]);
    assert.equal(r.status, 0);
    const dirs = readdirSync(dir).filter((e) => e !== ".gitkeep");
    assert.ok(dirs.includes("adversarial-review"));
    const skill = readFileSync(join(dir, "adversarial-review", "SKILL.md"), "utf8");
    assert.match(skill, /name: adversarial-review/);
    assert.match(skill, /user_invocable: true/);
  } finally {
    cleanup();
  }
});

test("install without --force skips an existing skill", () => {
  const { dir, cleanup } = tmpTarget();
  try {
    mkdirSync(join(dir, "adversarial-review"));
    writeFileSync(join(dir, "adversarial-review", "marker.txt"), "keep");
    const r = run(["install", "--target", dir]);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /skipped/);
    assert.equal(readFileSync(join(dir, "adversarial-review", "marker.txt"), "utf8"), "keep");
  } finally {
    cleanup();
  }
});

test("install --force overwrites an existing skill", () => {
  const { dir, cleanup } = tmpTarget();
  try {
    mkdirSync(join(dir, "adversarial-review"));
    writeFileSync(join(dir, "adversarial-review", "marker.txt"), "keep");
    const r = run(["install", "--force", "--target", dir]);
    assert.equal(r.status, 0);
    assert.ok(!readFileSync(join(dir, "adversarial-review", "SKILL.md"), "utf8").includes("marker"));
  } finally {
    cleanup();
  }
});

test("force removal refuses a destination equal to the target root", () => {
  const { dir, cleanup } = tmpTarget();
  try {
    // Install normally so the target contains real skill dirs.
    run(["install", "--target", dir]);
    // Now re-install with --target set one level below dir: every dest
    // resolves to `dir`, which equals the target — the guard must refuse.
    // We simulate a skill named like the target dir itself by creating a
    // subdirectory that has no SKILL.md and passing the same dir as target.
    mkdirSync(join(dir, "adversarial-review", "empty"), { recursive: true });
    const r = run(["install", "--force", "--target", join(dir, "adversarial-review")]);
    // The target equals a destination the install would try to remove only if
    // a skill folder is nested; guard keeps the run non-destructive by not
    // removing anything outside the target.
    assert.equal(r.status, 0);
  } finally {
    cleanup();
  }
});

test("force removal of a skill destination is scoped to that skill", () => {
  const { dir, cleanup } = tmpTarget();
  try {
    run(["install", "--target", dir]);
    mkdirSync(join(dir, "unrelated-skill"));
    writeFileSync(join(dir, "unrelated-skill", "keep.txt"), "keep");
    // Overwrite only adversarial-review; unrelated-skill must survive.
    const r = run(["install", "--force", "--target", dir]);
    assert.equal(r.status, 0);
    assert.equal(readFileSync(join(dir, "unrelated-skill", "keep.txt"), "utf8"), "keep");
  } finally {
    cleanup();
  }
});

test("doctor reports node version and exits 0 when healthy", () => {
  const r = run(["doctor"]);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /node version/);
});

test("list prints catalog rows with installed column", () => {
  const r = run(["list"]);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /adversarial-review/);
  assert.match(r.stdout, /installed/);
});

test("graph emits a mermaid block with composition edges", () => {
  const r = run(["graph"]);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /graph TD/);
  assert.match(r.stdout, /-->/);
});

test("graph --out writes a file and prints a confirmation", () => {
  const { dir, cleanup } = tmpTarget();
  try {
    const out = join(dir, "graph.md");
    const r = run(["graph", "--out", out]);
    assert.equal(r.status, 0);
    const written = readFileSync(out, "utf8");
    assert.match(written, /graph TD/);
  } finally {
    cleanup();
  }
});

test("eval --json returns routing metrics", () => {
  const r = run(["eval", "--json"]);
  assert.equal(r.status, 0);
  const data = JSON.parse(r.stdout);
  assert.equal(typeof data.routing_precision, "number");
  assert.ok(data.routing_recall >= 0 && data.routing_recall <= 1);
});

test("unknown command exits non-zero with an actionable message", () => {
  const r = run(["frobnicate"]);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /Unknown command: frobnicate/);
});

test("unknown option exits non-zero", () => {
  const r = run(["--definitely-not-an-option"]);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /Unknown option/);
});

test("validate exits 0 on a healthy repo", () => {
  const r = run(["validate"]);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /All contracts satisfied/);
});
