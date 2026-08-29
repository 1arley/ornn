/**
 * paths.js — Path safety and resolution
 *
 * Guards copied from the original CLI, adapted for provider-based installs.
 * Never delete outside the intended skill directory.
 */

import fs from "node:fs";
import os from "node:os";
import { resolve, parse, sep, join, dirname, basename } from "node:path";

/**
 * Resolve the real filesystem location of a path, following every symlink in
 * all existing ancestors. Components that do not exist yet are appended
 * verbatim (they cannot be symlinks). Returns null when the location cannot be
 * established (dangling symlink, unreadable directory).
 */
export function canonicalize(p) {
  const missing = [];
  let cur = resolve(p);
  for (;;) {
    let st = null;
    try {
      st = fs.lstatSync(cur);
    } catch (e) {
      if (e.code !== "ENOENT") return null;
    }
    if (st) {
      let real;
      try {
        real = fs.realpathSync(cur);
      } catch {
        return null; // dangling symlink or vanished between lstat and realpath
      }
      return missing.length ? join(real, ...missing) : real;
    }
    const parent = dirname(cur);
    if (parent === cur) return null;
    missing.unshift(basename(cur));
    cur = parent;
  }
}

/**
 * True when `dest`'s real location (symlinks resolved) stays inside `anchor`'s
 * real location. This is what the purely lexical startsWith check cannot see:
 * a symlinked directory committed to a malicious repo (e.g. `.claude` ->
 * the user's home) silently redirects every write outside the project.
 */
export function insideAnchor(dest, anchor, warn = console.error) {
  const anchorReal = canonicalize(anchor);
  const destReal = canonicalize(dest);
  if (!anchorReal || !destReal) {
    warn(`Refusing: cannot resolve real path for ${dest} (dangling symlink?)`);
    return false;
  }
  if (destReal !== anchorReal && !destReal.startsWith(anchorReal + sep)) {
    warn(`Refusing: ${dest} resolves to ${destReal}, outside ${anchorReal} (symlink in path)`);
    return false;
  }
  return true;
}

/**
 * Validate and resolve a destination path inside a target.
 * Returns the absolute path or null (after reporting via the `warn` callback).
 *
 * `warn` is a function(msg) called for each refusal. In tests, pass
 * `(msg) => errors.push(msg)`.
 *
 * `anchor` (optional): a path the *real* destination must stay inside. Pass
 * the project root for project-scope installs; pass null for global scope,
 * where the repo cannot plant symlinks in the user's home (a symlinked
 * ~/.claude is a legitimate dotfiles pattern, not an escape).
 */
export function safeDestFor(target, skillName, { warn = console.error, opts, anchor } = {}) {
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
  if (anchor && !insideAnchor(dest, anchor, warn)) {
    return null;
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
 * For global scope: the home directory (so .ornn-forge.json
 * lives at ~/.ornn-forge.json).
 */
export function resolveManifestRoot(scope, projectRoot) {
  if (scope === "global") {
    return os.homedir();
  }
  return projectRoot;
}