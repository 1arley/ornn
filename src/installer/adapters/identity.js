/**
 * identity.js — Identity adapter
 *
 * Passes the source Agent Skills format through unchanged. Used by every
 * destination that already reads the canonical SKILL.md format directly
 * (Agent Skills standard, OpenCode, Codex, Cursor, Gemini CLI).
 */

export default function adaptIdentity(content) {
  return content;
}
