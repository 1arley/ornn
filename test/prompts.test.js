/**
 * prompts.test.js — unit tests for the interactive installer prompts
 *
 * All prompts are driven with fake TTY streams injected explicitly, so these
 * tests never touch process.stdin / process.stdout. Keys are fed as real byte
 * sequences (arrow keys, app-cursor arrows, space, a/A, enter, ctrl+c, escape).
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { Readable, Writable } from "node:stream";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  promptMultiSelect,
  promptSelect,
  promptLine,
  promptConfirm,
} from "../src/installer/prompts.js";

// ---------------------------------------------------------------------------
// Fake TTY streams
// ---------------------------------------------------------------------------

class FakeStdin extends Readable {
  constructor({ isTTY = true } = {}) {
    super();
    this.isTTY = isTTY;
    this.isRaw = false;
    this.rawTransitions = [];
  }
  _read() {}
  setRawMode(value) {
    this.rawTransitions.push(Boolean(value));
    this.isRaw = Boolean(value);
    return this;
  }
  pushBytes(str) {
    this.push(Buffer.from(str, "utf8"));
    return this;
  }
}

class FakeStdout extends Writable {
  constructor({ isTTY = true, columns } = {}) {
    super();
    this.isTTY = isTTY;
    this.columns = columns;
    this.chunks = [];
  }
  _write(chunk, encoding, cb) {
    this.chunks.push(Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk));
    cb();
  }
  get output() {
    return this.chunks.join("");
  }
}

function makeIO({ stdinTTY = true, stdoutTTY = true, columns } = {}) {
  return {
    stdin: new FakeStdin({ isTTY: stdinTTY }),
    stdout: new FakeStdout({ isTTY: stdoutTTY, columns }),
  };
}

// Let the fake streams process queued writes before asserting on output.
async function settle() {
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));
}

// Visual-line counter mirroring the implementation's algorithm (for wrapping tests).
function visualLines(frame, columns) {
  const cols = (typeof columns === "number" && columns > 0 && Number.isFinite(columns)) ? columns : 80;
  const lines = frame.split("\n");
  // Frames end with a trailing "\n"; split() turns it into a trailing empty
  // segment that is NOT a visual line of the frame. Mirror the implementation
  // exactly: drop it, so the mirror matches the cursor-up accounting.
  if (frame.endsWith("\n")) {
    lines.pop();
  }
  return lines.reduce((n, line) => {
    const visible = line.replace(/\x1b\[[0-9;]*m/g, "");
    return n + (visible.length === 0 ? 1 : Math.max(1, Math.ceil(visible.length / cols)));
  }, 0);
}

function multiFrame(title, items, state, cursor) {
  const lines = [title, ""];
  for (let i = 0; i < items.length; i++) {
    const check = state[i] ? "☑" : "☐";
    if (i === cursor) lines.push(`\x1b[7m  ${check} ${items[i].label}\x1b[0m`);
    else lines.push(`  ${check} ${items[i].label}`);
  }
  lines.push("");
  lines.push("↑/↓ move · space toggle · a all · enter confirm · esc cancel");
  return lines.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// Multi-select
// ---------------------------------------------------------------------------

test("multi-select: initial checked + Enter resolves ids, restores terminal, prints summary", async () => {
  const { stdin, stdout } = makeIO({ columns: 80 });
  const items = [
    { id: "claude", label: "Claude Code", checked: true },
    { id: "opencode", label: "OpenCode", checked: true },
    { id: "cursor", label: "Cursor", checked: false },
  ];
  const p = promptMultiSelect({ title: "Select destinations:", items, stdin, stdout });
  await settle();
  stdin.pushBytes("\r");
  const result = await p;
  await settle();

  assert.deepEqual(result, ["claude", "opencode"]);
  // Raw mode was enabled then restored to the previous (non-raw) state.
  assert.ok(stdin.rawTransitions.includes(true), "set raw mode true");
  assert.equal(stdin.isRaw, false, "raw mode restored");
  assert.equal(stdin.rawTransitions.at(-1), false, "restored to previous (non-raw) state");
  // Listener removed.
  assert.equal(stdin.listenerCount("keypress"), 0, "keypress listener removed");
  // Cursor hidden then restored.
  assert.ok(stdout.output.includes("\x1b[?25l"), "cursor hidden before render");
  assert.ok(stdout.output.includes("\x1b[?25h"), "cursor restored on finish");
  // Frame rendered checkboxes + hint; permanent summary line printed.
  assert.ok(stdout.output.includes("☑ Claude Code"), "checkbox rendered");
  assert.ok(stdout.output.includes("↑/↓ move · space toggle · a all · enter confirm · esc cancel"), "hint rendered");
  assert.ok(stdout.output.includes("✓ Selected: Claude Code, OpenCode"), "summary line");
});

test("multi-select: down arrow + space toggles second item", async () => {
  const { stdin, stdout } = makeIO();
  const items = [
    { id: "a", label: "Alpha", checked: true },
    { id: "b", label: "Beta", checked: true },
    { id: "c", label: "Gamma", checked: false },
  ];
  const p = promptMultiSelect({ title: "Select:", items, stdin, stdout });
  await settle();
  stdin.pushBytes("\x1b[B"); // down → Beta
  stdin.pushBytes(" "); // untoggle Beta
  stdin.pushBytes("\r");
  const result = await p;
  assert.deepEqual(result, ["a"]);
});

test("multi-select: app-cursor arrows (\x1bOB/\x1bOA) navigate identically to arrow keys", async () => {
  const { stdin, stdout } = makeIO();
  const items = [
    { id: "a", label: "Alpha", checked: true },
    { id: "b", label: "Beta", checked: true },
    { id: "c", label: "Gamma", checked: false },
  ];
  const p = promptMultiSelect({ title: "Select:", items, stdin, stdout });
  await settle();
  stdin.pushBytes("\x1bOB"); // down (application-cursor mode) → Beta
  stdin.pushBytes("\x1bOA"); // up (application-cursor mode) → Alpha
  stdin.pushBytes(" "); // untoggle Alpha
  stdin.pushBytes("\r");
  const result = await p;
  assert.deepEqual(result, ["b"]);
});

test("multi-select: space toggles only the focused item", async () => {
  const { stdin, stdout } = makeIO();
  const items = [
    { id: "a", label: "Alpha", checked: true },
    { id: "b", label: "Beta", checked: true },
    { id: "c", label: "Gamma", checked: true },
  ];
  const p = promptMultiSelect({ title: "Select:", items, stdin, stdout });
  await settle();
  stdin.pushBytes("\x1b[B"); // down → Beta (focused)
  stdin.pushBytes(" "); // toggle only Beta
  stdin.pushBytes("\r");
  const result = await p;
  assert.deepEqual(result, ["a", "c"]);
});

test("multi-select: a selects all when partial, A deselects all when all selected", async () => {
  // "a" toggles all when a partial selection exists.
  const { stdin, stdout } = makeIO();
  const items = [
    { id: "a", label: "Alpha", checked: true },
    { id: "b", label: "Beta", checked: true },
    { id: "c", label: "Gamma", checked: false },
  ];
  const p = promptMultiSelect({ title: "Select:", items, stdin, stdout });
  await settle();
  stdin.pushBytes("a");
  stdin.pushBytes("\r");
  assert.deepEqual(await p, ["a", "b", "c"]);

  // "A" untoggles all when everything is selected.
  const { stdin: s2, stdout: o2 } = makeIO();
  const items2 = [
    { id: "a", label: "Alpha", checked: true },
    { id: "b", label: "Beta", checked: true },
  ];
  const p2 = promptMultiSelect({ title: "Select:", items: items2, stdin: s2, stdout: o2 });
  await settle();
  s2.pushBytes("A");
  s2.pushBytes("\r");
  assert.deepEqual(await p2, []);
});

test("multi-select: Enter with none selected resolves [] (not null)", async () => {
  const { stdin, stdout } = makeIO();
  const items = [
    { id: "a", label: "Alpha", checked: false },
    { id: "b", label: "Beta", checked: false },
  ];
  const p = promptMultiSelect({ title: "Select:", items, stdin, stdout });
  await settle();
  stdin.pushBytes("\r");
  const result = await p;
  assert.deepEqual(result, []);
  assert.notEqual(result, null);
  assert.ok(stdout.output.includes("✓ Selected: none"), "empty summary uses 'none'");
});

test("multi-select: Ctrl+C cancels (null), restores terminal, and leaks no listener", async () => {
  const { stdin, stdout } = makeIO();
  const items = [
    { id: "a", label: "Alpha", checked: true },
    { id: "b", label: "Beta", checked: true },
    { id: "c", label: "Gamma", checked: false },
  ];
  const p = promptMultiSelect({ title: "Select:", items, stdin, stdout });
  await settle();
  stdin.pushBytes("\x03");
  const result = await p;
  await settle();

  assert.equal(result, null);
  assert.equal(stdin.isRaw, false, "raw mode restored");
  assert.equal(stdin.rawTransitions.at(-1), false);
  assert.ok(stdout.output.includes("\x1b[?25h"), "cursor restored");
  assert.equal(stdin.listenerCount("keypress"), 0, "no leaked keypress listener");

  // A second prompt on the same fake input must still work.
  const p2 = promptMultiSelect({ title: "Again:", items, stdin, stdout });
  await settle();
  stdin.pushBytes("\r");
  const r2 = await p2;
  assert.deepEqual(r2, ["a", "b"]);
  assert.equal(stdin.listenerCount("keypress"), 0);
});

test("multi-select: Esc cancels (null)", async () => {
  const { stdin, stdout } = makeIO();
  const items = [
    { id: "a", label: "Alpha", checked: true },
    { id: "b", label: "Beta", checked: false },
  ];
  const p = promptMultiSelect({ title: "Select:", items, stdin, stdout });
  await settle();
  stdin.pushBytes("\x1b"); // lone escape → readline escape-code timeout → "escape"
  const result = await p; // resolves after the ~500ms escape timeout
  await settle();
  assert.equal(result, null);
  assert.equal(stdin.isRaw, false);
  assert.ok(stdout.output.includes("\x1b[?25h"));
});

test("multi-select: q cancels (null)", async () => {
  const { stdin, stdout } = makeIO();
  const items = [{ id: "a", label: "Alpha", checked: true }];
  const p = promptMultiSelect({ title: "Select:", items, stdin, stdout });
  await settle();
  stdin.pushBytes("q");
  const result = await p;
  assert.equal(result, null);
});

test("single-item navigation wraps safely and Enter confirms", async () => {
  const { stdin, stdout } = makeIO();
  const items = [{ id: "only", label: "Only option" }];
  const p = promptMultiSelect({ title: "T", items, stdin, stdout });
  await settle();
  stdin.pushBytes("\x1b[B"); // down wraps to 0
  stdin.pushBytes("\x1b[A"); // up wraps to 0
  stdin.pushBytes(" "); // select the only item
  stdin.pushBytes("\r");
  const result = await p;
  assert.deepEqual(result, ["only"]);
});

// ---------------------------------------------------------------------------
// Rendering (no full clears, correct cursor-up counts)
// ---------------------------------------------------------------------------

test("narrow columns: cursor-up count matches visual lines and \x1b[2J never appears", async () => {
  const { stdin, stdout } = makeIO({ columns: 20 });
  const items = [
    { id: "long", label: "This is a very long label that wraps across multiple visual lines", checked: true },
    { id: "short", label: "Short", checked: false },
  ];
  const p = promptMultiSelect({ title: "Select destinations:", items, stdin, stdout });
  await settle();
  stdin.pushBytes("\x1b[B"); // 0 → 1
  stdin.pushBytes("\x1b[B"); // 1 → 0
  stdin.pushBytes("\r");
  const result = await p;
  await settle();

  assert.deepEqual(result, ["long"]);
  const expectedFrame = multiFrame("Select destinations:", items, [true, false], 0);
  const expectedLines = visualLines(expectedFrame, 20);
  const cursorUps = [...stdout.output.matchAll(/\x1b\[(\d+)A/g)].map((m) => Number(m[1]));
  // 2 arrow re-renders + 1 finish clear.
  assert.equal(cursorUps.length, 3, "one cursor-up per re-render plus finish");
  for (const n of cursorUps) {
    assert.ok(n >= 1 && Number.isInteger(n), `valid cursor-up count: ${n}`);
    assert.equal(n, expectedLines, `cursor-up ${n} matches ${expectedLines} visual lines`);
  }
  assert.ok(!stdout.output.includes("\x1b[2J"), "never emits a full-screen clear");
});

test("columns undefined falls back to 80 without invalid escapes", async () => {
  const { stdin, stdout } = makeIO({ columns: undefined });
  const items = [
    { id: "a", label: "Alpha with a moderately long label", checked: true },
    { id: "b", label: "Beta", checked: false },
  ];
  const p = promptMultiSelect({ title: "Select destinations:", items, stdin, stdout });
  await settle();
  stdin.pushBytes("\x1b[B "); // down → Beta, space → select Beta
  stdin.pushBytes("\r");
  const result = await p;
  await settle();

  assert.deepEqual(result, ["a", "b"]);
  const cursorUps = [...stdout.output.matchAll(/\x1b\[(\d+)A/g)].map((m) => Number(m[1]));
  for (const n of cursorUps) {
    assert.ok(n >= 1 && Number.isInteger(n), `valid cursor-up count: ${n}`);
  }
  assert.ok(!/\x1b\[0A/.test(stdout.output), "no zero-line cursor-up");
  assert.ok(!stdout.output.includes("\x1b[2J"), "no full-screen clear");
});

// ---------------------------------------------------------------------------
// promptSelect
// ---------------------------------------------------------------------------

test("promptSelect navigates with app-cursor arrows and returns the focused id", async () => {
  const { stdin, stdout } = makeIO();
  const items = [
    { id: "project", label: "Current project" },
    { id: "global", label: "Globally" },
  ];
  const p = promptSelect({
    title: "Where do you want to install?",
    items,
    defaultIndex: 0,
    stdin,
    stdout,
  });
  await settle();
  stdin.pushBytes("\x1bOB"); // down (app-cursor) → Globally
  stdin.pushBytes("\x1bOA"); // up (app-cursor) → Current project
  stdin.pushBytes("\x1bOB"); // down → Globally
  stdin.pushBytes("\r");
  const result = await p;
  await settle();

  assert.equal(result, "global");
  assert.ok(stdout.output.includes("› "), "radio bullet marker rendered");
  assert.ok(stdout.output.includes("✓ Globally"), "summary line present");
  assert.equal(stdin.listenerCount("keypress"), 0);
});

test("promptSelect: defaultIndex normalization (negative/out-of-range → 0)", async () => {
  const { stdin, stdout } = makeIO();
  const items = [{ id: "a", label: "A" }, { id: "b", label: "B" }];
  const p = promptSelect({ title: "T", items, defaultIndex: 99, stdin, stdout });
  await settle();
  stdin.pushBytes("\r");
  assert.equal(await p, "a");
});

test("promptSelect: cancel via q returns null", async () => {
  const { stdin, stdout } = makeIO();
  const items = [{ id: "a", label: "A" }, { id: "b", label: "B" }];
  const p = promptSelect({ title: "T", items, stdin, stdout });
  await settle();
  stdin.pushBytes("q");
  assert.equal(await p, null);
});

// ---------------------------------------------------------------------------
// promptLine / promptConfirm (readline-backed)
// ---------------------------------------------------------------------------

test("promptLine: typed input + Enter resolves the value", async () => {
  const { stdin, stdout } = makeIO();
  const p = promptLine({ prompt: "Name:", default: "dflt", stdin, stdout });
  await settle();
  stdin.push("hello\r");
  const result = await p;
  await settle();
  assert.equal(result, "hello");
  assert.equal(stdin.listenerCount("keypress"), 0, "readline cleaned up after answer");
  assert.ok(stdout.output.includes("Name:"), "prompt text rendered");
});

test("promptLine: empty input + Enter resolves the default", async () => {
  const { stdin, stdout } = makeIO();
  const p = promptLine({ prompt: "Name:", default: "dflt", stdin, stdout });
  await settle();
  stdin.push("\r");
  const result = await p;
  await settle();
  assert.equal(result, "dflt");
});

test("promptLine: re-prompts when validation fails, then resolves the valid value", async () => {
  const { stdin, stdout } = makeIO();
  const validate = (v) => v === "good";
  const p = promptLine({ prompt: "Name:", default: "", validate, stdin, stdout });
  await settle();
  stdin.push("bad\r"); // fails validation → fresh prompt on the same stdin
  await settle();
  stdin.push("good\r");
  const result = await p;
  await settle();
  assert.equal(result, "good");
});

test("promptLine: Ctrl+D (EOF) resolves null instead of hanging forever", async () => {
  const { stdin, stdout } = makeIO();
  const p = promptLine({ prompt: "Name:", default: "dflt", stdin, stdout });
  await settle();
  // EOF: readline closes the interface WITHOUT running the question callback
  // or SIGINT. Before the close-event fix this promise never resolved.
  stdin.push(null);
  const result = await p;
  await settle();
  assert.equal(result, null);
  assert.equal(stdin.listenerCount("keypress"), 0, "readline cleaned up on close");
});

test("promptLine: Ctrl+C still resolves null after the settle refactor", async () => {
  const { stdin, stdout } = makeIO();
  const p = promptLine({ prompt: "Name:", default: "dflt", stdin, stdout });
  await settle();
  // Ctrl+C keypress → readline emits SIGINT on the interface → settle(null).
  stdin.pushBytes("\x03");
  const result = await p;
  await settle();
  assert.equal(result, null);
});

test("promptConfirm: 'y' + Enter resolves true, 'n' + Enter resolves false", async () => {
  const { stdin, stdout } = makeIO();
  const p = promptConfirm({ prompt: "Continue?", defaultAnswer: "n", stdin, stdout });
  await settle();
  stdin.push("y\r");
  assert.equal(await p, true);

  const { stdin: s2, stdout: o2 } = makeIO();
  const p2 = promptConfirm({ prompt: "Continue?", defaultAnswer: "y", stdin: s2, stdout: o2 });
  await settle();
  s2.push("n\r");
  assert.equal(await p2, false);
  assert.ok(o2.output.includes("Continue?"), "prompt text rendered");
});

test("promptConfirm: unrecognized input + Enter resolves the default", async () => {
  const { stdin, stdout } = makeIO();
  const p = promptConfirm({ prompt: "Continue?", defaultAnswer: "n", stdin, stdout });
  await settle();
  stdin.push("maybe\r");
  assert.equal(await p, false);
});

test("promptConfirm: Ctrl+D (EOF) resolves null instead of hanging forever", async () => {
  const { stdin, stdout } = makeIO();
  const p = promptConfirm({ prompt: "Continue?", defaultAnswer: "y", stdin, stdout });
  await settle();
  // EOF: readline closes without the question callback. Must resolve null
  // (distinct from the default `true`).
  stdin.push(null);
  const result = await p;
  await settle();
  assert.equal(result, null);
  assert.equal(stdin.listenerCount("keypress"), 0, "readline cleaned up on close");
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

test("empty items: multi resolves [], select resolves null, no raw mode", async () => {
  const { stdin, stdout } = makeIO();
  const pm = promptMultiSelect({ title: "T", items: [], stdin, stdout });
  assert.deepEqual(await pm, []);
  assert.equal(stdin.rawTransitions.length, 0, "no raw mode for empty multi");
  assert.equal(stdin.listenerCount("keypress"), 0);

  const { stdin: s2, stdout: o2 } = makeIO();
  const ps = promptSelect({ title: "T", items: [], stdin: s2, stdout: o2 });
  assert.equal(await ps, null);
  assert.ok(o2.output.includes("No options available."), "empty select reports no options on TTY");
  assert.equal(s2.rawTransitions.length, 0, "no raw mode for empty select");
});

test("non-TTY inputs resolve defaults without listeners, raw mode, or TUI output", async () => {
  const stdin = new FakeStdin({ isTTY: false });
  const stdout = new FakeStdout({ isTTY: false });

  const multi = await promptMultiSelect({
    title: "T",
    items: [
      { id: "a", label: "A", checked: true },
      { id: "b", label: "B", checked: false },
    ],
    stdin,
    stdout,
  });
  assert.deepEqual(multi, ["a"], "multi returns initially checked ids");

  const sel = await promptSelect({
    title: "T",
    items: [{ id: "x", label: "X" }, { id: "y", label: "Y" }],
    defaultIndex: 1,
    stdin,
    stdout,
  });
  assert.equal(sel, "y", "select returns default item id");

  const line = await promptLine({ prompt: "Name:", default: "dflt", stdin, stdout });
  assert.equal(line, "dflt", "line returns default");

  const conf = await promptConfirm({ prompt: "Continue?", defaultAnswer: "y", stdin, stdout });
  assert.equal(conf, true, "confirm returns default boolean");

  assert.equal(stdin.rawTransitions.length, 0, "no raw mode");
  assert.equal(stdin.listenerCount("keypress"), 0, "no keypress listeners");
  assert.equal(stdout.output, "", "no TUI output written");
});

// ---------------------------------------------------------------------------
// CLI smoke
// ---------------------------------------------------------------------------

test("CLI --help still exits 0 (non-interactive smoke)", () => {
  const CLI = resolve(dirname(fileURLToPath(import.meta.url)), "..", "bin", "cli.js");
  const r = spawnSync("node", [CLI, "--help"], { encoding: "utf8" });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /install/);
});
