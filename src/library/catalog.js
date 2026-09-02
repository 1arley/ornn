import fs from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";

const TYPES = {
  skill: { root: "skills", filename: "SKILL.md" },
  pattern: { root: "patterns", filename: "pattern.yaml" },
  recipe: { root: "recipes", suffix: ".yaml" },
  collection: { root: "collections", filename: "collection.yaml" },
  command: { root: "commands", suffix: ".yaml" },
};

function walk(path) {
  if (!fs.existsSync(path)) return [];
  const entries = [];
  for (const item of fs.readdirSync(path, { withFileTypes: true })) {
    const child = join(path, item.name);
    if (item.isDirectory()) entries.push(...walk(child));
    else if (item.isFile()) entries.push(child);
  }
  return entries;
}

function scalar(text, key) {
  const match = text.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  return match ? match[1].trim().replace(/^['"]|['"]$/g, "") : null;
}

export function yamlList(text, key) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `${key}:`);
  if (start < 0) return [];
  const indent = lines[start].match(/^\s*/)[0].length;
  const values = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const currentIndent = line.match(/^\s*/)[0].length;
    if (currentIndent <= indent) break;
    const item = line.trim().match(/^-\s+(.+)$/);
    if (item) values.push(item[1].trim().replace(/^['"]|['"]$/g, ""));
  }
  return values;
}

function itemId(type, root, file) {
  if (type === "skill") return relative(join(root, "skills"), dirname(file)).split(sep).join("/");
  if (type === "pattern") return relative(join(root, "patterns"), dirname(file)).split(sep).join("/");
  if (type === "collection") return basename(dirname(file));
  const base = relative(join(root, TYPES[type].root), file).split(sep).join("/");
  return base.replace(/\.yaml$/, "");
}

export function loadLibrary(root) {
  const items = [];
  let sourceVersion = "unversioned";
  try { sourceVersion = JSON.parse(fs.readFileSync(join(root, "catalog", "library.json"), "utf8")).sourceVersion; } catch {}
  for (const [type, spec] of Object.entries(TYPES)) {
    for (const file of walk(join(root, spec.root))) {
      if (spec.filename && basename(file) !== spec.filename) continue;
      if (spec.suffix && !file.endsWith(spec.suffix)) continue;
      const content = fs.readFileSync(file, "utf8");
      items.push({
        type,
        id: itemId(type, root, file),
        name: scalar(content, "name") || basename(file, ".yaml"),
        description: scalar(content, "description") || "",
        version: scalar(content, "version") || sourceVersion,
        path: file,
        content,
        skills: yamlList(content, "skills"),
        recipes: yamlList(content, "recipes"),
        collections: yamlList(content, "collections"),
        patterns: yamlList(content, "patterns"),
      });
    }
  }
  return items.sort((a, b) => a.type.localeCompare(b.type) || a.id.localeCompare(b.id));
}

export function searchLibrary(root, query, type = null) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  return loadLibrary(root).filter((item) => {
    if (type && item.type !== type) return false;
    const haystack = `${item.id}\n${item.name}\n${item.description}\n${item.content}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

export function resolveItem(root, identifier) {
  const prefix = identifier.match(/^(skills?|patterns?|recipes?|collections?|commands?):/i)?.[1]?.toLowerCase() || null;
  const normalized = identifier.replace(/^(skills?|patterns?|recipes?|collections?|commands?):/i, "");
  const singular = prefix ? prefix.replace(/s$/, "") : null;
  const items = loadLibrary(root).filter((item) => !singular || item.type === singular);
  const exact = items.filter((item) => item.id === normalized || item.name === normalized);
  if (exact.length === 1) return exact[0];
  const suffix = items.filter((item) => item.id.endsWith(`/${normalized}`));
  return suffix.length === 1 ? suffix[0] : null;
}

export function resolveSkillSelection(root, names = []) {
  const all = loadLibrary(root);
  const skills = new Set();
  const visiting = new Set();
  const add = (name) => {
    if (visiting.has(name)) throw new Error(`Circular library selection: ${name}`);
    visiting.add(name);
    const item = resolveItem(root, name);
    if (!item) throw new Error(`Unknown skill, collection or recipe: ${name}`);
    if (item.type === "skill") skills.add(item.id);
    else if (item.type === "collection" || item.type === "recipe" || item.type === "command") {
      for (const child of item.skills) add(`skill:${child}`);
      for (const child of item.recipes) add(`recipe:${child}`);
      for (const child of item.collections) add(`collection:${child}`);
    } else throw new Error(`${name} does not select installable skills`);
    visiting.delete(name);
  };
  if (!names.length) return all.filter((item) => item.type === "skill").map((item) => item.id);
  names.forEach(add);
  return [...skills].sort();
}

export function sourceSkills(root, selectedIds = []) {
  const selected = new Set(selectedIds.length ? selectedIds : resolveSkillSelection(root));
  return loadLibrary(root).filter((item) => item.type === "skill" && selected.has(item.id)).map((item) => ({
    category: item.id.split("/")[0],
    name: item.name,
    id: item.id,
    src: dirname(item.path),
  }));
}
