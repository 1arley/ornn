#!/usr/bin/env node
import fs from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)));
const RULES = JSON.parse(fs.readFileSync(join(ROOT, "frontend", "rules.json"), "utf8")).rules;
const ignored = new Set([".git", "node_modules", "dist", "coverage"]);

function filesUnder(target) {
  const result = [];
  const visit = (path) => {
    const stat = fs.statSync(path);
    if (stat.isFile()) { result.push(path); return; }
    for (const entry of fs.readdirSync(path, { withFileTypes: true })) {
      if (entry.isDirectory() && ignored.has(entry.name)) continue;
      visit(join(path, entry.name));
    }
  };
  visit(target);
  return result;
}

export function scan(target) {
  const findings = [];
  for (const file of filesUnder(resolve(target))) {
    const extension = extname(file);
    const applicable = RULES.filter((rule) => rule.extensions.includes(extension));
    if (!applicable.length) continue;
    let content;
    try { content = fs.readFileSync(file, "utf8"); } catch { continue; }
    const lines = content.split(/\r?\n/);
    for (const rule of applicable) {
      const regex = new RegExp(rule.pattern, "g");
      lines.forEach((line, index) => {
        regex.lastIndex = 0;
        if (regex.test(line)) findings.push({ rule: rule.id, severity: rule.severity, file, line: index + 1, message: rule.message });
      });
    }
  }
  return findings;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const target = process.argv.find((arg) => !arg.startsWith("-") && arg !== process.argv[0] && arg !== process.argv[1]) || process.cwd();
  const findings = scan(target);
  if (process.argv.includes("--json")) process.stdout.write(JSON.stringify({ findings }, null, 2) + "\n");
  else for (const item of findings) process.stdout.write(`${item.file}:${item.line} [${item.rule}] ${item.message}\n`);
  process.exitCode = findings.some((item) => item.severity === "error") ? 1 : 0;
}
