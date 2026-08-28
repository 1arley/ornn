/**
 * paths.js — Path safety and resolution
 *
 * Guards copied from the original CLI, adapted for provider-based installs.
 * Never delete outside the intended skill directory.
 */

import fs from "node:fs";
import os from "node:os";
import { resolve, parse, sep, join } from "node:path";

/**
 * Validate and resolve a destination path inside a target.
 * Returns the absolute path or null (after reporting via the `warn` callback).
 *
 * `warn` is a function(msg) called for each refusal. In tests, pass
 * `(msg) => errors.push(msg)`.
 */
export function safeDestFor(target, skillName, { warn = console.error, opts } = {}) {
  const targetAbs = resolve(target);
  const dest = resolve(targetAbs, skillName);
  const home = resolve(os.homedir());

  if (dest === parse(dest).root) {
    warn(`Refusing: ${dest} is the filesystem root`);
    return null;
  }
  if (dest === home) {
    warn(`Refusing: ${dest} is the home directory`);
    return null;
  }
  if (!dest.startsWith(targetAbs + sep)) {
    warn(`Refusing: ${dest} is outside the target ${targetAbs}`);
    return null;
  }
  if (dest === targetAbs) {
    warn(`Refusing: ${dest} equals the target`);
    return null;
  }
  if (opts && opts.force) {
    if (dest === join(home, ".claude", "skills")) {
      warn(`Refusing: ${dest} is the default skills directory root`);
      return null;
    }
  }
  return dest;
}

/**
 * Resolve the project root directory.
 * Uses the current working directory by default.
 */
export function resolveProjectRoot(cwd) {
  return resolve(cwd || process.cwd());
}

/**
 * Resolve installation root for the manifest.
 * For project scope: the project root directory.
 * For global scope: the home directory (so .agent-engineering-skills.json
 * lives at ~/.agent-engineering-skills.json).
 */
export function resolveManifestRoot(scope, projectRoot) {
  if (scope === "global") {
    return os.homedir();
  }
  return projectRoot;
}