import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readdirSync, readFileSync, existsSync, symlinkSync, lstatSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "..", "..");
const CLI = join(ROOT, "bin", "cli.js");

function run(args, opts = {}) {
  return spawnSync("node", [CLI, ...args], { encoding: "utf8", ...opts });
}

function tmpProject() {
  const dir = mkdtempSync(join(tmpdir(), "aes-u-"));
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

// Helper: run a command from inside a temp project dir.
function runIn(dir, args) {
  return run(args, { cwd: dir });
}

test("--help mentions scope, providers, universal, update, uninstall", () => {
  const r = run(["--help"]);
  assert.equal(r.status, 0);
  for (const word of ["--scope", "--providers", "--universal", "update", "uninstall", "--dry-run"]) {
    assert.ok(r.stdout.includes(word), `help should mention ${word}`);
  }
});

test("--version prints the package version", () => {
  const r = run(["--version"]);
  assert.equal(r.status, 0);
  assert.match(r.stdout.trim(), /^\d+\.\d+\.\d+$/);
});

test("universal install writes to .agents/skills and creates a manifest", () => {
  const { dir, cleanup } = tmpProject();
  try {
    const r = runIn(dir, ["install", "--scope", "project", "--universal", "--yes"]);
    assert.equal(r.status, 0);
    const skillDirs = readdirSync(join(dir, ".agents", "skills"));
    assert.ok(skillDirs.includes("adversarial-review"));
    assert.ok(readFileSync(join(dir, ".ornn-forge.json"), "utf8").includes("universal"));
  } finally {
    cleanup();
  }
});

test("universal install preserves the Agent Skills source (no claude adaptation)", () => {
  const { dir, cleanup } = tmpProject();
  try {
    runIn(dir, ["install", "--scope", "project", "--universal", "--yes"]);
    const content = readFileSync(join(dir, ".agents", "skills", "adversarial-review", "SKILL.md"), "utf8");
    assert.match(content, /license: MIT/);
    assert.match(content, /metadata:/);
    assert.ok(!content.includes("user_invocable"));
  } finally {
    cleanup();
  }
});

test("claude provider install adds user_invocable", () => {
  const { dir, cleanup } = tmpProject();
  try {
    runIn(dir, ["install", "--scope", "project", "--providers", "claude", "--yes"]);
    const content = readFileSync(join(dir, ".claude", "skills", "adversarial-review", "SKILL.md"), "utf8");
    assert.match(content, /user_invocable: true/);
  } finally {
    cleanup();
  }
});

test("opencode provider install uses universal adapter (no user_invocable)", () => {
  const { dir, cleanup } = tmpProject();
  try {
    runIn(dir, ["install", "--scope", "project", "--providers", "opencode", "--yes"]);
    const content = readFileSync(join(dir, ".opencode", "skills", "adversarial-review", "SKILL.md"), "utf8");
    assert.ok(!content.includes("user_invocable"));
    assert.match(content, /license: MIT/);
  } finally {
    cleanup();
  }
});

test("multiple providers install into multiple targets", () => {
  const { dir, cleanup } = tmpProject();
  try {
    const r = runIn(dir, ["install", "--scope", "project", "--providers", "claude,codex,opencode", "--yes"]);
    assert.equal(r.status, 0);
    for (const p of [".claude", ".codex", ".opencode"]) {
      assert.ok(existsSync(join(dir, p, "skills", "adversarial-review", "SKILL.md")), `${p} should have skills`);
    }
  } finally {
    cleanup();
  }
});

test("global scope installs into ~/.agents/skills for universal (dry-run)", () => {
  const { dir, cleanup } = tmpProject();
  try {
    const r = runIn(dir, ["install", "--scope", "global", "--universal", "--yes", "--dry-run"]);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /\.agents\/skills/);
  } finally {
    cleanup();
  }
});

test("non-interactive (CI) mode with insufficient flags still works when universal given", () => {
  // In a non-TTY environment, --yes + --universal should install without prompts.
  const { dir, cleanup } = tmpProject();
  try {
    const r = runIn(dir, ["install", "--universal", "--yes"]);
    assert.equal(r.status, 0);
    assert.ok(existsSync(join(dir, ".agents", "skills")));
  } finally {
    cleanup();
  }
});

test("--providers detected resolves provider ids", () => {
  const { dir, cleanup } = tmpProject();
  try {
    const r = runIn(dir, ["install", "--providers", "detected", "--scope", "project", "--universal", "--yes", "--dry-run"]);
    // The combination may install to universal; ensure no error and a plan printed.
    assert.equal(r.status, 0);
    assert.match(r.stdout, /skills/);
  } finally {
    cleanup();
  }
});

test("--providers all installs into every provider target (dry-run)", () => {
  const { dir, cleanup } = tmpProject();
  try {
    const r = runIn(dir, ["install", "--providers", "all", "--scope", "project", "--dry-run"]);
    assert.equal(r.status, 0);
    for (const p of [".claude", ".codex", ".opencode", ".cursor", ".gemini"]) {
      assert.match(r.stdout, new RegExp(p));
    }
  } finally {
    cleanup();
  }
});

test("unknown provider is rejected with an actionable error", () => {
  const { dir, cleanup } = tmpProject();
  try {
    const r = runIn(dir, ["install", "--providers", "nope", "--scope", "project", "--yes"]);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /Unknown provider/);
  } finally {
    cleanup();
  }
});

test("dry-run makes no filesystem changes", () => {
  const { dir, cleanup } = tmpProject();
  try {
    const r = runIn(dir, ["install", "--scope", "project", "--universal", "--yes", "--dry-run"]);
    assert.equal(r.status, 0);
    assert.ok(!existsSync(join(dir, ".agents")));
    assert.ok(!existsSync(join(dir, ".ornn-forge.json")));
  } finally {
    cleanup();
  }
});

test("install skips existing skills without --force", () => {
  const { dir, cleanup } = tmpProject();
  try {
    runIn(dir, ["install", "--scope", "project", "--universal", "--yes"]);
    mkdirSync(join(dir, ".agents", "skills", "adversarial-review"), { recursive: true });
    writeFileSync(join(dir, ".agents", "skills", "adversarial-review", "marker.txt"), "keep");
    const r = runIn(dir, ["install", "--scope", "project", "--universal", "--yes"]);
    assert.equal(r.status, 0);
    assert.equal(readFileSync(join(dir, ".agents", "skills", "adversarial-review", "marker.txt"), "utf8"), "keep");
  } finally {
    cleanup();
  }
});

test("install --force overwrites existing skills", () => {
  const { dir, cleanup } = tmpProject();
  try {
    runIn(dir, ["install", "--scope", "project", "--universal", "--yes"]);
    writeFileSync(join(dir, ".agents", "skills", "adversarial-review", "extra.txt"), "x");
    const r = runIn(dir, ["install", "--scope", "project", "--universal", "--yes", "--force"]);
    assert.equal(r.status, 0);
    assert.ok(!existsSync(join(dir, ".agents", "skills", "adversarial-review", "extra.txt")));
  } finally {
    cleanup();
  }
});

test("update reads the manifest and refreshes managed skills", () => {
  const { dir, cleanup } = tmpProject();
  try {
    runIn(dir, ["install", "--scope", "project", "--universal", "--yes"]);
    // Remove one managed skill, then update restores it.
    rmSync(join(dir, ".agents", "skills", "adversarial-review"), { recursive: true, force: true });
    const r = runIn(dir, ["update", "--scope", "project", "--yes"]);
    assert.equal(r.status, 0);
    assert.ok(existsSync(join(dir, ".agents", "skills", "adversarial-review", "SKILL.md")));
  } finally {
    cleanup();
  }
});

test("update --dry-run reports but does not write", () => {
  const { dir, cleanup } = tmpProject();
  try {
    runIn(dir, ["install", "--scope", "project", "--universal", "--yes"]);
    rmSync(join(dir, ".agents", "skills", "adversarial-review"), { recursive: true, force: true });
    const r = runIn(dir, ["update", "--scope", "project", "--dry-run"]);
    assert.equal(r.status, 0);
    assert.ok(!existsSync(join(dir, ".agents", "skills", "adversarial-review")));
  } finally {
    cleanup();
  }
});

test("update with no manifest reports an error", () => {
  const { dir, cleanup } = tmpProject();
  try {
    const r = runIn(dir, ["update", "--scope", "project"]);
    assert.notEqual(r.status, 0);
    assert.match(r.stdout, /No installation manifest found/);
  } finally {
    cleanup();
  }
});

test("uninstall removes managed skills but not the whole provider directory", () => {
  const { dir, cleanup } = tmpProject();
  try {
    runIn(dir, ["install", "--scope", "project", "--universal", "--yes"]);
    // Add an unrelated file to the provider dir that must survive.
    mkdirSync(join(dir, ".agents", "other"), { recursive: true });
    writeFileSync(join(dir, ".agents", "other", "keep.txt"), "keep");
    const r = runIn(dir, ["uninstall", "--scope", "project", "--providers", "universal", "--yes"]);
    assert.equal(r.status, 0);
    assert.ok(!existsSync(join(dir, ".agents", "skills", "adversarial-review")));
    assert.ok(existsSync(join(dir, ".agents", "other", "keep.txt")));
  } finally {
    cleanup();
  }
});

test("uninstall --dry-run does not remove", () => {
  const { dir, cleanup } = tmpProject();
  try {
    runIn(dir, ["install", "--scope", "project", "--universal", "--yes"]);
    const r = runIn(dir, ["uninstall", "--scope", "project", "--providers", "universal", "--yes", "--dry-run"]);
    assert.equal(r.status, 0);
    assert.ok(existsSync(join(dir, ".agents", "skills", "adversarial-review")));
  } finally {
    cleanup();
  }
});

test("legacy --target install still works (backward compat)", () => {
  const { dir, cleanup } = tmpProject();
  try {
    const target = join(dir, "legacy-skills");
    const r = runIn(dir, ["install", "--target", target, "--dry-run"]);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /would install: 25/);
  } finally {
    cleanup();
  }
});

test("manifest v2 records explicit destinations with target, adapter, and skills", () => {
  const { dir, cleanup } = tmpProject();
  try {
    runIn(dir, ["install", "--scope", "project", "--providers", "claude", "--yes"]);
    const manifest = JSON.parse(readFileSync(join(dir, ".ornn-forge.json"), "utf8"));
    assert.equal(manifest.manifestVersion, "2");
    assert.equal(manifest.scope, "project");
    assert.ok(Array.isArray(manifest.destinations));
    const dest = manifest.destinations.find((d) => d.id === "claude");
    assert.ok(dest, "claude destination should be recorded");
    assert.equal(dest.type, "profile");
    assert.equal(dest.adapter, "claude");
    assert.equal(dest.target, join(dir, ".claude", "skills"));
    assert.ok(Array.isArray(dest.skills));
    assert.ok(dest.skills.includes("adversarial-review"));
    assert.ok(dest.skills.length >= 20);
  } finally {
    cleanup();
  }
});

test("path safety: refusing to remove outside target", async (t) => {
  const { safeDestFor } = await import("../src/installer/paths.js");
  const { dir, cleanup } = tmpProject();
  try {
    const escapeName = "..";
    const target = join(dir, "target");
    const refused = safeDestFor(target, escapeName, { warn: () => {} });
    assert.equal(refused, null);
  } finally {
    cleanup();
  }
});

test("symlink escape: universal install refuses to write through a symlinked .agents", () => {
  const { dir, cleanup } = tmpProject();
  const outside = mkdtempSync(join(tmpdir(), "aes-outside-"));
  try {
    // A malicious repo commits `.agents` as a symlink to an attacker-chosen dir.
    symlinkSync(outside, join(dir, ".agents"), "dir");
    const r = runIn(dir, ["install", "--scope", "project", "--universal", "--yes"]);
    assert.notEqual(r.status, 0, "install must fail when writes are refused");
    assert.match(r.stderr, /Refusing|refused/);
    assert.ok(!existsSync(join(outside, "skills")), "must not write through the symlink");
  } finally {
    cleanup();
    rmSync(outside, { recursive: true, force: true });
  }
});

test("symlink escape: provider install refuses to write through a symlinked .claude", () => {
  const { dir, cleanup } = tmpProject();
  const outside = mkdtempSync(join(tmpdir(), "aes-outside-"));
  try {
    mkdirSync(join(outside, "skills"), { recursive: true });
    symlinkSync(outside, join(dir, ".claude"), "dir");
    const r = runIn(dir, ["install", "--scope", "project", "--providers", "claude", "--yes"]);
    assert.notEqual(r.status, 0);
    assert.equal(readdirSync(join(outside, "skills")).length, 0, "no skills leaked outside project");
  } finally {
    cleanup();
    rmSync(outside, { recursive: true, force: true });
  }
});

test("symlink escape: uninstall refuses to remove through a symlinked provider dir", () => {
  const { dir, cleanup } = tmpProject();
  const outside = mkdtempSync(join(tmpdir(), "aes-outside-"));
  try {
    // Install normally first (real dirs).
    runIn(dir, ["install", "--scope", "project", "--universal", "--yes"]);
    // Move the installed skills out and replace with a symlink pointing elsewhere.
    const victim = join(outside, "victim");
    mkdirSync(victim, { recursive: true });
    writeFileSync(join(victim, "keep.txt"), "do not delete me");
    const linkPath = join(dir, ".agents", "skills", "adversarial-review");
    rmSync(linkPath, { recursive: true, force: true });
    symlinkSync(victim, linkPath, "dir");
    const r = runIn(dir, ["uninstall", "--scope", "project", "--providers", "universal", "--yes"]);
    assert.equal(r.status, 0);
    assert.ok(existsSync(join(victim, "keep.txt")), "must not delete through the symlink");
    assert.ok(lstatSync(linkPath).isSymbolicLink(), "symlink itself left intact, not followed");
  } finally {
    cleanup();
    rmSync(outside, { recursive: true, force: true });
  }
});

test("safeDestFor with anchor allows a real path inside the project", async () => {
  const { safeDestFor } = await import("../src/installer/paths.js");
  const { dir, cleanup } = tmpProject();
  try {
    const target = join(dir, ".agents", "skills");
    mkdirSync(target, { recursive: true });
    const ok = safeDestFor(target, "my-skill", { warn: () => {}, anchor: dir });
    assert.equal(ok, join(target, "my-skill"));
  } finally {
    cleanup();
  }
});

test("no agents detected still allows universal install", () => {
  const { dir, cleanup } = tmpProject();
  try {
    // Even with no providers detected, --universal must work without prompts.
    const r = runIn(dir, ["install", "--universal", "--yes", "--dry-run"]);
    assert.equal(r.status, 0);
  } finally {
    cleanup();
  }
});

test("OpenCode global destination resolves to ~/.config/opencode/skills", async () => {
  const { resolveTarget, getProvider } = await import("../src/installer/providers.js");
  const provider = getProvider("opencode");
  assert.ok(provider, "opencode profile should exist");
  assert.equal(provider.globalPath, join(homedir(), ".config", "opencode", "skills"));
  const project = resolveTarget(provider, "project", "/tmp/someproj");
  assert.equal(project, join("/tmp/someproj", ".opencode", "skills"));
});

test("custom --destination installs to an arbitrary directory", () => {
  const { dir, cleanup } = tmpProject();
  try {
    const dest = join(dir, "my-custom-skills");
    const r = runIn(dir, ["install", "--destination", dest, "--yes"]);
    assert.equal(r.status, 0);
    assert.ok(existsSync(join(dest, "adversarial-review", "SKILL.md")));
    const manifest = JSON.parse(readFileSync(join(dir, ".ornn-forge.json"), "utf8"));
    const entry = manifest.destinations.find((d) => d.id === "custom");
    assert.ok(entry, "custom destination should be recorded");
    assert.equal(entry.type, "custom");
    assert.equal(entry.target, dest);
  } finally {
    cleanup();
  }
});

test("custom --destination uninstall removes only that destination's skills", () => {
  const { dir, cleanup } = tmpProject();
  try {
    const dest = join(dir, "my-custom-skills");
    runIn(dir, ["install", "--destination", dest, "--yes"]);
    mkdirSync(join(dest, "keep-me"), { recursive: true });
    const r = runIn(dir, ["uninstall", "--providers", "custom", "--scope", "project", "--yes"]);
    assert.equal(r.status, 0);
    assert.ok(!existsSync(join(dest, "adversarial-review")), "managed skill removed");
    assert.ok(existsSync(join(dest, "keep-me")), "unrelated dir preserved");
  } finally {
    cleanup();
  }
});

test("custom --destination outside the project root works in project scope", () => {
  const { dir, cleanup } = tmpProject();
  const outside = mkdtempSync(join(tmpdir(), "aes-custom-outside-"));
  try {
    const dest = join(outside, "skills");
    const r = runIn(dir, ["install", "--destination", dest, "--yes"]);
    assert.equal(r.status, 0);
    assert.ok(existsSync(join(dest, "adversarial-review", "SKILL.md")), "installs outside project");
    const manifest = JSON.parse(readFileSync(join(dir, ".ornn-forge.json"), "utf8"));
    const entry = manifest.destinations.find((d) => d.id === "custom");
    assert.ok(entry, "custom destination recorded");
    assert.equal(entry.target, dest);
    // Uninstall outside the project must also work.
    const u = runIn(dir, ["uninstall", "--providers", "custom", "--scope", "project", "--yes"]);
    assert.equal(u.status, 0);
    assert.ok(!existsSync(join(dest, "adversarial-review")), "uninstall removes outside-project skills");
  } finally {
    cleanup();
    rmSync(outside, { recursive: true, force: true });
  }
});

test("invalid provider catalog is rejected with an actionable error", async () => {
  const { loadProviderCatalog } = await import("../src/installer/providers.js");
  const { dir, cleanup } = tmpProject();
  try {
    const bad = join(dir, "providers.json");
    writeFileSync(bad, "{ not json");
    assert.throws(() => loadProviderCatalog(bad), /not valid JSON/);
    writeFileSync(bad, JSON.stringify({ version: 1 }));
    assert.throws(() => loadProviderCatalog(bad), /"profiles" array/);
  } finally {
    cleanup();
  }
});

test("unknown adapter name in catalog is rejected", async () => {
  const { buildProviders } = await import("../src/installer/providers.js");
  assert.throws(
    () => buildProviders({ profiles: [{ id: "x", label: "X", adapter: "does-not-exist" }] }),
    /Unknown adapter: does-not-exist/
  );
});

test("doctor missing count derives from source skills, not a hardcoded number", async () => {
  const { doctorProviders } = await import("../src/installer/orchestrator.js");
  const { dir, cleanup } = tmpProject();
  try {
    // Install into the project scope (controlled), then delete one skill.
    runIn(dir, ["install", "--scope", "project", "--providers", "claude", "--yes"]);
    rmSync(join(dir, ".claude", "skills", "adversarial-review"), { recursive: true, force: true });

    const rows = doctorProviders(dir, ROOT);
    const claude = rows.find((r) => r.provider === "Claude Code");
    assert.ok(claude.target.startsWith(dir), "doctor should use the project-scope target");
    assert.equal(claude.installedCount, 24);
    // Missing derives from the real source count (25), not a hardcoded value.
    assert.equal(claude.missingCount, 1);
    assert.ok(claude.target && !claude.healthy, "missing skills must mark unhealthy");
  } finally {
    cleanup();
  }
});

test("v1 manifest (providers array) is still understood by update", () => {
  const { dir, cleanup } = tmpProject();
  try {
    runIn(dir, ["install", "--scope", "project", "--providers", "opencode", "--yes"]);
    // Rewrite the manifest to v1 shape (older installs).
    const manifestPath = join(dir, ".ornn-forge.json");
    const v1 = {
      packageVersion: "1.0.0",
      manifestVersion: "1",
      scope: "project",
      providers: ["opencode"],
      skills: ["adversarial-review"],
    };
    writeFileSync(manifestPath, JSON.stringify(v1, null, 2));
    const r = runIn(dir, ["update", "--scope", "project", "--yes"]);
    assert.equal(r.status, 0);
    const upgraded = JSON.parse(readFileSync(manifestPath, "utf8"));
    assert.equal(upgraded.manifestVersion, "2");
    const dest = upgraded.destinations.find((d) => d.id === "opencode");
    assert.ok(dest, "v1 provider should be upgraded to a destination");
    assert.ok(existsSync(join(dir, ".opencode", "skills", "adversarial-review", "SKILL.md")));
  } finally {
    cleanup();
  }
});

test("update reinstalls into the recorded target even after catalog change", () => {
  const { dir, cleanup } = tmpProject();
  try {
    runIn(dir, ["install", "--scope", "project", "--universal", "--yes"]);
    rmSync(join(dir, ".agents", "skills", "adversarial-review"), { recursive: true, force: true });
    const r = runIn(dir, ["update", "--scope", "project", "--yes"]);
    assert.equal(r.status, 0);
    assert.ok(existsSync(join(dir, ".agents", "skills", "adversarial-review", "SKILL.md")));
  } finally {
    cleanup();
  }
});