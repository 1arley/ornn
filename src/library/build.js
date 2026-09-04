import fs from "node:fs";
import { join, resolve } from "node:path";
import { getAdapter } from "../installer/adapters/index.js";
import { distributionSkills } from "./catalog.js";

function copyTree(src, dest, adapter) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = join(src, entry.name);
    const to = join(dest, entry.name);
    if (entry.isDirectory()) copyTree(from, to, adapter);
    else if (entry.isFile()) {
      const content = fs.readFileSync(from, "utf8");
      fs.writeFileSync(to, entry.name === "SKILL.md" ? adapter(content) : content);
    }
  }
}

function copyPrivateFiles(files, dest) {
  for (const file of files || []) {
    const target = join(dest, ...file.dest.split("/"));
    fs.mkdirSync(join(target, ".."), { recursive: true });
    fs.copyFileSync(file.src, target);
  }
}

export function buildDistributions(root, { providers = ["generic", "claude", "opencode", "codex", "cursor"], clean = true, profile = "gateway" } = {}) {
  const dist = join(root, "dist");
  fs.mkdirSync(dist, { recursive: true });
  const skills = distributionSkills(root, { profile });
  const library = JSON.parse(fs.readFileSync(join(root, "catalog", "library.json"), "utf8"));
  const built = [];
  for (const provider of providers) {
    const descriptorPath = join(root, "integrations", provider, "integration.json");
    if (!fs.existsSync(descriptorPath)) throw new Error(`Unknown integration: ${provider}`);
    const descriptor = JSON.parse(fs.readFileSync(descriptorPath, "utf8"));
    const providerOutput = join(dist, provider);
    if (clean && fs.existsSync(providerOutput)) fs.rmSync(providerOutput, { recursive: true, force: true });
    const adapter = getAdapter(descriptor.adapter);
    const providerRoot = join(providerOutput, "skills");
    for (const skill of skills) {
      const destination = join(providerRoot, skill.name);
      copyTree(skill.src, destination, adapter);
      copyPrivateFiles(skill.privateFiles, destination);
    }
    fs.mkdirSync(join(dist, provider), { recursive: true });
    fs.writeFileSync(join(dist, provider, "manifest.json"), JSON.stringify({
      generated: true,
      source: "skills/",
      integration: provider,
      version: descriptor.version,
      sourceVersion: library.sourceVersion,
      profile,
      skills: skills.map((skill) => ({ id: skill.id, name: skill.name })),
    }, null, 2) + "\n");
    built.push({ provider, skills: skills.length, path: resolve(dist, provider) });
  }
  return built;
}
