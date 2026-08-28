/**
 * prompts.js — Interactive terminal prompts
 *
 * Zero-dependency TUI. Only used when stdin is a TTY.
 * Non-interactive environments (CI) must never call these.
 */

import readline from "node:readline";

function keypressToInput(input, key) {
  // Normalize arrow keys and special keys into control sequences.
  if (!key) return input;
  if (key.name === "up") return "[A";
  if (key.name === "down") return "[B";
  if (key.name === "return" || key.name === "enter") return "\r";
  if (key.name === "space") return " ";
  if (key.name === "a") return "a";
  return input;
}

/**
 * Show a prompt with default value, read one line.
 * `opts`: { prompt, default, validate }
 * Returns the entered value (or default if empty).
 */
export function promptLine({ prompt, default: dflt = "", validate = null }) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const suffix = dflt ? ` [${dflt}]` : "";
  return new Promise((resolve) => {
    rl.question(`${prompt}${suffix} `, (answer) => {
      rl.close();
      const value = answer.trim() || dflt;
      if (validate && !validate(value)) {
        resolve(promptLine({ prompt, default: dflt, validate }));
        return;
      }
      resolve(value);
    });
  });
}

/**
 * Multi-select prompt with arrows, space, a (all), enter (confirm).
 * `items`: array of { id, label, checked }
 * Returns the array of selected ids.
 */
export function promptMultiSelect({ title, items }) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });
  let cursor = 0;
  const state = items.map((item) => Boolean(item.checked));

  const render = () => {
    process.stdout.write("[2J[H");
    process.stdout.write(`${title}\n\n`);
    items.forEach((item, i) => {
      const marker = i === cursor ? "[7m" : "";
      const check = state[i] ? "☑" : "☐";
      process.stdout.write(`${marker}  ${check} ${item.label}[0m\n`);
    });
    process.stdout.write(`\n↑/↓ move · space toggle · a all · enter confirm\n`);
  };

  return new Promise((resolve) => {
    render();
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on("data", (buf) => {
      const key = keypressToInput("", { name: null });
      const str = buf.toString();
      if (str === "[A") {
        cursor = (cursor - 1 + items.length) % items.length;
        render();
      } else if (str === "[B") {
        cursor = (cursor + 1) % items.length;
        render();
      } else if (str === " ") {
        state[cursor] = !state[cursor];
        render();
      } else if (str.toLowerCase() === "a") {
        const allSelected = state.every(Boolean);
        state.fill(!allSelected);
        render();
      } else if (str === "\r" || str === "\n") {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        rl.close();
        process.stdout.write("[2J[H");
        resolve(items.filter((_, i) => state[i]).map((item) => item.id));
      }
    });
  });
}

/**
 * Yes/No confirmation with a default.
 * `defaultAnswer`: "y" or "n". Returns boolean.
 */
export function promptConfirm({ prompt, defaultAnswer = "y" }) {
  return new Promise((resolve) => {
    const suffix = defaultAnswer === "y" ? "Y/n" : "y/N";
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`${prompt} ${suffix} `, (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      if (normalized === "y" || normalized === "yes") return resolve(true);
      if (normalized === "n" || normalized === "no") return resolve(false);
      resolve(defaultAnswer === "y");
    });
  });
}