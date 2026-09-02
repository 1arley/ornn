#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDistributions } from "../../src/library/build.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const providersArg = process.argv.find((arg) => arg.startsWith("--providers="));
const providers = providersArg ? providersArg.slice("--providers=".length).split(",").filter(Boolean) : undefined;
for (const result of buildDistributions(root, { providers })) {
  process.stdout.write(`Built ${result.provider}: ${result.skills} skills → ${result.path}\n`);
}
