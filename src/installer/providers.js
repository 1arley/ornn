/**
 * providers.js — Provider Registry
 *
 * Single source of truth for supported Agent Skill providers.
 * Adding a new provider means adding one entry here.
 *
 * Each provider:
 * - id: short slug used in flags and manifests
 * - name: human-readable name for UI
 * - detect: array of {type, path} hints for auto-detection
 * - projectPath: relative path inside the current project
 * - globalPath: absolute path for global installation (null if not supported)
 * - adapter: function that transforms skill content for the provider
 *   (or the string "universal" to copy without modification)
 *
 * Detection is advisory; the user can always select a non-detected provider.
 */

import fs from "node:fs";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function binExists(name) {
  const r = spawnSync("which", [name], { encoding: "utf8" });
  return r.status === 0;
}

function dirExists(path) {
  try {
    return fs.statSync(path).isDirectory();
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Adapters
// ---------------------------------------------------------------------------

/**
 * Claude Code adapter: adds `user_invocable: true` to the frontmatter.
 */
function adaptForClaude(original) {
  const m = original.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return original;
  const fm = m[1];
  const body = original.slice(m[0].length);
  const get = (key) => {
    const re = new RegExp(`^${key}:\\s*(.+)$`, "m");
    const hit = fm.match(re);
    return hit ? hit[1].trim().replace(/^['"]|['"]$/g, "") : null;
  };
  const name = get("name");
  const description = get("description");
  if (!name || !description) return original;
  return `---\nname: ${name}\ndescription: ${description}\nuser_invocable: true\n---\n${body}`;
}

/**
 * Universal adapter: pass through (Agent Skills format is already the source).
 */
function adaptUniversal(original) {
  return original;
}

// ---------------------------------------------------------------------------
// Provider definitions
// ---------------------------------------------------------------------------

const PROVIDERS = [
  {
    id: "claude",
    name: "Claude Code",
    detect: [
      () => dirExists(join(os.homedir(), ".claude")) && binExists("claude"),
      () => dirExists(join(os.homedir(), ".claude", "skills")),
    ],
    projectPath: ".claude/skills",
    globalPath: join(os.homedir(), ".claude", "skills"),
    adapter: adaptForClaude,
  },
  {
    id: "codex",
    name: "Codex",
    detect: [
      () => binExists("codex"),
      () => dirExists(join(os.homedir(), ".codex")),
    ],
    projectPath: ".codex/skills",
    globalPath: join(os.homedir(), ".codex", "skills"),
    adapter: adaptUniversal,
  },
  {
    id: "opencode",
    name: "OpenCode",
    detect: [
      () => binExists("opencode"),
      () => dirExists(join(os.homedir(), ".opencode")),
    ],
    projectPath: ".opencode/skills",
    globalPath: join(os.homedir(), ".opencode", "skills"),
    adapter: adaptUniversal,
  },
  {
    id: "cursor",
    name: "Cursor",
    detect: [
      () => binExists("cursor"),
      () => dirExists(join(os.homedir(), ".cursor")),
    ],
    projectPath: ".cursor/skills",
    globalPath: join(os.homedir(), ".cursor", "skills"),
    adapter: adaptUniversal,
  },
  {
    id: "gemini",
    name: "Gemini CLI",
    detect: [
      () => binExists("gemini"),
      () => dirExists(join(os.homedir(), ".gemini")),
    ],
    projectPath: ".gemini/skills",
    globalPath: join(os.homedir(), ".gemini", "skills"),
    adapter: adaptUniversal,
  },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Return the full provider definition by id.
 */
export function getProvider(id) {
  return PROVIDERS.find((p) => p.id === id) || null;
}

/**
 * Return all registered providers.
 */
export function getAllProviders() {
  return PROVIDERS;
}

/**
 * Return a list of provider ids that are "detected" (any check passes).
 */
export function detectProviders() {
  const detected = [];
  for (const provider of PROVIDERS) {
    if (provider.detect.some((check) => check())) {
      detected.push(provider.id);
    }
  }
  return detected;
}

/**
 * Resolve the target path for a provider given a scope.
 * `scope` is "project" or "global". `projectRoot` is the current working
 * directory (used only for project scope).
 */
export function resolveTarget(provider, scope, projectRoot) {
  if (scope === "global") {
    return provider.globalPath;
  }
  return join(projectRoot, provider.projectPath);
}