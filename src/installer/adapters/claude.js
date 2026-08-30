/**
 * claude.js — Claude Code adapter
 *
 * Claude Code requires `user_invocable: true` in the frontmatter to expose a
 * skill for manual invocation. This is the only documented transformation the
 * Claude profile needs; everything else is preserved verbatim.
 */

export default function adaptForClaude(original) {
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
