/** A row from `cmux list-workspaces`. */
export interface WorkspaceRow {
  /** Stable-ish ref used by cmux commands, e.g. `workspace:16`. */
  readonly ref: string;
  readonly title: string;
  readonly selected: boolean;
}

// Leading glyphs cmux prefixes to titles: ✳ (attention) and the braille
// spinner block, plus a few common status dots.
const LEADING_GLYPH = /^[✳⠀-⣿●○◆•]\s+/;

/** Removes a leading status glyph (e.g. "✳ ") from a workspace title. */
export function stripGlyph(title: string): string {
  return title.replace(LEADING_GLYPH, "");
}

/** Parses `cmux list-workspaces` output into ordered rows. */
export function parseWorkspaces(text: string): WorkspaceRow[] {
  const rows: WorkspaceRow[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.replace(/\r$/, "");
    const m = line.match(/^([*\s])\s*(workspace:\d+)\s+(.*)$/);
    if (!m) continue;

    let rest = m[3];
    let selected = m[1] === "*";
    const selIdx = rest.indexOf("[selected]");
    if (selIdx >= 0) {
      selected = true;
      rest = rest.slice(0, selIdx);
    }

    const title = stripGlyph(rest.trim()).trim();
    rows.push({ ref: m[2], title, selected });
  }
  return rows;
}

/** Parsed `cmux list-status` line. */
export interface CmuxStatus {
  readonly state: string;
  readonly color?: string;
}

/** Parses a `cmux list-status` / `sidebar-state` status line such as
 * `claude_code=Needs input icon=bell.fill color=#4C8DFF`. */
export function parseStatus(text: string): CmuxStatus {
  const line = text.split("\n").find((l) => l.includes("=")) ?? "";
  const eq = line.indexOf("=");
  if (eq < 0) return { state: "" };

  const after = line.slice(eq + 1);
  const cut = after.search(/\s+(?:icon|color)=/);
  const state = (cut >= 0 ? after.slice(0, cut) : after).trim();
  const color = after.match(/color=(#[0-9a-fA-F]{6})/)?.[1];
  return { state, color };
}

// cmux agent states -> the plugin's shared status vocabulary (so the existing
// status->colour mapping and renderer work unchanged).
const STATE_MAP: Readonly<Record<string, string>> = {
  running: "running",
  working: "running",
  "needs input": "waiting",
  waiting: "waiting",
  idle: "idle",
  done: "idle",
  completed: "idle",
  error: "error",
  failed: "error",
};

/** Maps a cmux state label to the plugin's status vocabulary. */
export function mapCmuxState(state: string): string {
  const key = state.trim().toLowerCase();
  return STATE_MAP[key] ?? key;
}
