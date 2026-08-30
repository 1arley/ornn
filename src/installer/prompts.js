/**
 * prompts.js — Interactive terminal prompts
 *
 * Zero-dependency TUI. Uses readline.emitKeypressEvents for keypress handling
 * (no manual byte parsing), readline.createInterface for line input.
 * All interactive prompt functions accept { stdin, stdout } for testability.
 * Non-interactive environments (CI) short-circuit and return defaults.
 */

import readline from "node:readline";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Strip ANSI SGR escape codes (e.g. "\x1b[7m", "\x1b[0m") from a string.
 * @param {string} str
 * @returns {string}
 */
function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

/**
 * Count the number of visual lines a frame string occupies on the terminal.
 * Each line of the frame is split; SGR codes are stripped for width measurement.
 * Empty lines count as 1 visual line. Long lines wrap at `columns`.
 * @param {string} frame
 * @param {number} [columns]
 * @returns {number}
 */
function countVisualLines(frame, columns) {
  const cols = (typeof columns === "number" && columns > 0 && Number.isFinite(columns)) ? columns : 80;
  const lines = frame.split("\n");
  // Frames are written with a trailing "\n" so the cursor ends on the line
  // AFTER the last content line. split("\n") turns that final newline into a
  // trailing empty segment. That segment is not a visual line of the frame:
  // counting it moves the cursor one line too far up on every redraw, so the
  // drift accumulates and progressively erases content above the prompt.
  // Drop it so the count is the exact number of lines to move up to reach the
  // line where the frame started.
  if (frame.endsWith("\n")) {
    lines.pop();
  }
  let count = 0;
  for (const line of lines) {
    const visible = stripAnsi(line);
    if (visible.length === 0) {
      count += 1;
    } else {
      count += Math.max(1, Math.ceil(visible.length / cols));
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
// Frame builders
// ---------------------------------------------------------------------------

/**
 * Build the multi-select frame string.
 * @param {string} title
 * @param {Array<{id: string, label: string}>} items
 * @param {boolean[]} state
 * @param {number} cursor
 * @returns {string}
 */
function buildMultiFrame(title, items, state, cursor) {
  const lines = [title, ""];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const isFocused = i === cursor;
    const check = state[i] ? "☑" : "☐";
    if (isFocused) {
      lines.push(`\x1b[7m  ${check} ${item.label}\x1b[0m`);
    } else {
      lines.push(`  ${check} ${item.label}`);
    }
  }
  lines.push("");
  lines.push("↑/↓ move · space toggle · a all · enter confirm · esc cancel");
  return lines.join("\n") + "\n";
}

/**
 * Build the select (radio) frame string.
 * @param {string} title
 * @param {Array<{id: string, label: string}>} items
 * @param {number} cursor
 * @returns {string}
 */
function buildSelectFrame(title, items, cursor) {
  const lines = [title, ""];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (i === cursor) {
      lines.push(`› \x1b[7m${item.label}\x1b[0m`);
    } else {
      lines.push(`  ${item.label}`);
    }
  }
  lines.push("");
  lines.push("↑/↓ move · enter confirm · esc cancel");
  return lines.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// promptMultiSelect
// ---------------------------------------------------------------------------

/**
 * Interactive multi-select prompt with arrow keys, space, a/A, Enter, Esc/q/Ctrl+C.
 *
 * @param {object} opts
 * @param {string} opts.title
 * @param {Array<{id: string, label: string, checked?: boolean}>} opts.items
 * @param {import("node:stream").Readable} [opts.stdin]
 * @param {import("node:stream").Writable} [opts.stdout]
 * @returns {Promise<string[]|null>} Selected ids, or null on cancel.
 */
export function promptMultiSelect({ title, items, stdin = process.stdin, stdout = process.stdout }) {
  // Empty items
  if (!items || items.length === 0) {
    return Promise.resolve([]);
  }

  // Non-TTY: return initially checked items immediately
  if (!stdin.isTTY || !stdout.isTTY) {
    return Promise.resolve(items.filter((i) => i.checked).map((i) => i.id));
  }

  const state = items.map((i) => Boolean(i.checked));
  let cursor = 0;
  let previousRenderedLines = 0;
  let finished = false;
  const wasRaw = stdin.isRaw || false;

  readline.emitKeypressEvents(stdin);

  return new Promise((resolve, reject) => {
    function finish(result) {
      if (finished) return;
      finished = true;
      // Clear frame
      if (previousRenderedLines > 0) {
        try { stdout.write(`\x1b[${previousRenderedLines}A\x1b[J`); } catch {}
      }
      // Restore cursor
      try { stdout.write("\x1b[?25h"); } catch {}
      // Remove listener
      stdin.removeListener("keypress", onKeypress);
      // Restore raw mode
      if (stdin.setRawMode && stdin.isTTY) {
        try { stdin.setRawMode(wasRaw); } catch {}
      }
      // Summary
      if (result !== null) {
        const labels = result.map((id) => {
          const item = items.find((i) => i.id === id);
          return item ? item.label : id;
        });
        const summary = labels.length > 0 ? labels.join(", ") : "none";
        try { stdout.write(`\u2713 Selected: ${summary}\n`); } catch {}
      }
      resolve(result);
    }

    function render() {
      const frame = buildMultiFrame(title, items, state, cursor);
      if (previousRenderedLines > 0) {
        try { stdout.write(`\x1b[${previousRenderedLines}A\x1b[J`); } catch {}
      }
      try { stdout.write(frame); } catch {}
      previousRenderedLines = countVisualLines(frame, stdout.columns);
    }

    const onKeypress = (str, key) => {
      if (finished) return;
      try {
        if (key.name === "up") {
          cursor = (cursor - 1 + items.length) % items.length;
          render();
        } else if (key.name === "down") {
          cursor = (cursor + 1) % items.length;
          render();
        } else if (key.name === "space") {
          state[cursor] = !state[cursor];
          render();
        } else if (key.name === "a") {
          const allSelected = state.every(Boolean);
          state.fill(!allSelected);
          render();
        } else if (key.name === "return" || key.name === "enter") {
          const selected = [];
          for (let i = 0; i < items.length; i++) {
            if (state[i]) selected.push(items[i].id);
          }
          finish(selected);
        } else if (key.name === "escape" || key.name === "q" || (key.ctrl && key.name === "c")) {
          finish(null);
        }
      } catch (err) {
        // Cleanup on exception, then reject
        try { stdout.write("\x1b[?25h"); } catch {}
        if (stdin.setRawMode && stdin.isTTY) {
          try { stdin.setRawMode(wasRaw); } catch {}
        }
        stdin.removeListener("keypress", onKeypress);
        finished = true;
        reject(err);
      }
    };

    // Hide cursor
    try { stdout.write("\x1b[?25l"); } catch {}
    // Set raw mode
    if (stdin.setRawMode && stdin.isTTY) {
      try { stdin.setRawMode(true); } catch {}
    }
    // Register keypress listener
    stdin.on("keypress", onKeypress);
    // Initial render
    render();
  });
}

// ---------------------------------------------------------------------------
// promptSelect
// ---------------------------------------------------------------------------

/**
 * Interactive single-select (radio) prompt with arrow keys, Enter, Esc/q/Ctrl+C.
 *
 * @param {object} opts
 * @param {string} opts.title
 * @param {Array<{id: string, label: string}>} opts.items
 * @param {number} [opts.defaultIndex]
 * @param {import("node:stream").Readable} [opts.stdin]
 * @param {import("node:stream").Writable} [opts.stdout]
 * @returns {Promise<string|null>} Selected item id, or null on cancel.
 */
export function promptSelect({ title, items, defaultIndex = 0, stdin = process.stdin, stdout = process.stdout }) {
  // Empty items
  if (!items || items.length === 0) {
    if (stdin.isTTY && stdout.isTTY) {
      try { stdout.write("No options available.\n"); } catch {}
    }
    return Promise.resolve(null);
  }

  // Normalize defaultIndex
  let idx = Number.isInteger(defaultIndex) ? defaultIndex : 0;
  if (idx < 0 || idx >= items.length) idx = 0;

  // Non-TTY: return default item id
  if (!stdin.isTTY || !stdout.isTTY) {
    return Promise.resolve(items[idx].id);
  }

  let cursor = idx;
  let previousRenderedLines = 0;
  let finished = false;
  const wasRaw = stdin.isRaw || false;

  readline.emitKeypressEvents(stdin);

  return new Promise((resolve, reject) => {
    function finish(result) {
      if (finished) return;
      finished = true;
      // Clear frame
      if (previousRenderedLines > 0) {
        try { stdout.write(`\x1b[${previousRenderedLines}A\x1b[J`); } catch {}
      }
      // Restore cursor
      try { stdout.write("\x1b[?25h"); } catch {}
      // Remove listener
      stdin.removeListener("keypress", onKeypress);
      // Restore raw mode
      if (stdin.setRawMode && stdin.isTTY) {
        try { stdin.setRawMode(wasRaw); } catch {}
      }
      // Summary
      if (result !== null) {
        const item = items.find((i) => i.id === result);
        if (item) {
          try { stdout.write(`\u2713 ${item.label}\n`); } catch {}
        }
      }
      resolve(result);
    }

    function render() {
      const frame = buildSelectFrame(title, items, cursor);
      if (previousRenderedLines > 0) {
        try { stdout.write(`\x1b[${previousRenderedLines}A\x1b[J`); } catch {}
      }
      try { stdout.write(frame); } catch {}
      previousRenderedLines = countVisualLines(frame, stdout.columns);
    }

    const onKeypress = (str, key) => {
      if (finished) return;
      try {
        if (key.name === "up") {
          cursor = (cursor - 1 + items.length) % items.length;
          render();
        } else if (key.name === "down") {
          cursor = (cursor + 1) % items.length;
          render();
        } else if (key.name === "return" || key.name === "enter") {
          finish(items[cursor].id);
        } else if (key.name === "escape" || key.name === "q" || (key.ctrl && key.name === "c")) {
          finish(null);
        }
      } catch (err) {
        try { stdout.write("\x1b[?25h"); } catch {}
        if (stdin.setRawMode && stdin.isTTY) {
          try { stdin.setRawMode(wasRaw); } catch {}
        }
        stdin.removeListener("keypress", onKeypress);
        finished = true;
        reject(err);
      }
    };

    // Hide cursor
    try { stdout.write("\x1b[?25l"); } catch {}
    // Set raw mode
    if (stdin.setRawMode && stdin.isTTY) {
      try { stdin.setRawMode(true); } catch {}
    }
    // Register keypress listener
    stdin.on("keypress", onKeypress);
    // Initial render
    render();
  });
}

// ---------------------------------------------------------------------------
// promptLine
// ---------------------------------------------------------------------------

/**
 * Prompt for a single line of text input.
 * Uses readline.question. Ctrl+C and Ctrl+D (EOF) return null.
 *
 * @param {object} opts
 * @param {string} opts.prompt
 * @param {string} [opts.default]
 * @param {Function} [opts.validate]
 * @param {import("node:stream").Readable} [opts.stdin]
 * @param {import("node:stream").Writable} [opts.stdout]
 * @returns {Promise<string|null>}
 */
export function promptLine({ prompt, default: dflt = "", validate = null, stdin = process.stdin, stdout = process.stdout }) {
  // Non-TTY: return default immediately
  if (!stdin.isTTY || !stdout.isTTY) {
    return Promise.resolve(dflt);
  }

  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: stdin, output: stdout });
    const suffix = dflt ? ` [${dflt}]` : "";

    // Guarded settlement: whichever of the question callback, SIGINT, or the
    // close event fires first wins; later calls are no-ops. Without the close
    // handler, Ctrl+D (EOF) at an empty prompt closes the interface without
    // running the question callback or SIGINT, leaving this promise forever
    // pending (the CLI then exits 0 without completing the action).
    let settled = false;
    const settle = (value) => {
      if (settled) return;
      settled = true;
      try { rl.close(); } catch {}
      resolve(value);
    };

    // close fires after the question callback (Enter), after SIGINT, and on
    // EOF (Ctrl+D). With the settled guard it only settles when neither of
    // the other paths has already done so.
    rl.once("close", () => settle(null));
    rl.on("SIGINT", () => settle(null));

    try {
      rl.question(`${prompt}${suffix} `, (answer) => {
        const value = answer.trim() || dflt;
        if (validate && !validate(value)) {
          // Re-prompt: claim settlement and close THIS interface before
          // creating the next readline on the same input stream — close()
          // pauses the stream, so the new interface must be created after
          // (and the pending 'close' event must settle as a no-op).
          settled = true;
          try { rl.close(); } catch {}
          resolve(promptLine({ prompt, default: dflt, validate, stdin, stdout }));
          return;
        }
        settle(value);
      });
    } catch (e) {
      settled = true;
      try { rl.close(); } catch {}
      resolve(promptLine({ prompt, default: dflt, validate, stdin, stdout }));
    }
  });
}

// ---------------------------------------------------------------------------
// promptConfirm
// ---------------------------------------------------------------------------

/**
 * Yes/No confirmation prompt with a default answer.
 * Ctrl+C and Ctrl+D (EOF) return null.
 *
 * @param {object} opts
 * @param {string} opts.prompt
 * @param {string} [opts.defaultAnswer]
 * @param {import("node:stream").Readable} [opts.stdin]
 * @param {import("node:stream").Writable} [opts.stdout]
 * @returns {Promise<boolean|null>}
 */
export function promptConfirm({ prompt, defaultAnswer = "y", stdin = process.stdin, stdout = process.stdout }) {
  // Non-TTY: return default immediately
  if (!stdin.isTTY || !stdout.isTTY) {
    return Promise.resolve(defaultAnswer === "y");
  }

  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: stdin, output: stdout });
    const suffix = defaultAnswer === "y" ? "Y/n" : "y/N";

    // Guarded settlement (see promptLine): the close handler covers Ctrl+D
    // (EOF), which closes the interface without ever invoking the question
    // callback, and is a no-op when Enter or SIGINT settled first.
    let settled = false;
    const settle = (value) => {
      if (settled) return;
      settled = true;
      try { rl.close(); } catch {}
      resolve(value);
    };

    rl.once("close", () => settle(null));
    rl.on("SIGINT", () => settle(null));

    rl.question(`${prompt} ${suffix} `, (answer) => {
      const normalized = answer.trim().toLowerCase();
      if (normalized === "y" || normalized === "yes") return settle(true);
      if (normalized === "n" || normalized === "no") return settle(false);
      settle(defaultAnswer === "y");
    });
  });
}