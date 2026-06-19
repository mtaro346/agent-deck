/** Visual treatment for a session status, used on keys and the dial display. */
export interface StatusVisual {
  /** Accent colour (Tokyo Night palette, matching agent-deck's own UI). */
  readonly color: string;
  /** Short, lower-case human label. */
  readonly label: string;
}

const VISUALS: Readonly<Record<string, StatusVisual>> = {
  running: { color: "#9ece6a", label: "running" },
  waiting: { color: "#e0af68", label: "waiting" },
  idle: { color: "#7aa2f7", label: "idle" },
  starting: { color: "#7dcfff", label: "starting" },
  queued: { color: "#bb9af7", label: "queued" },
  stopped: { color: "#565f89", label: "stopped" },
  error: { color: "#f7768e", label: "error" },
};

const UNKNOWN: StatusVisual = { color: "#414868", label: "?" };

/** Maps an agent-deck status string to its visual treatment. */
export function statusVisual(status: string | undefined): StatusVisual {
  if (!status) return UNKNOWN;
  return VISUALS[status.toLowerCase()] ?? UNKNOWN;
}

/** Truncates a title with an ellipsis so it fits a key or dial readout. */
export function truncateTitle(title: string, max = 18): string {
  const t = (title ?? "").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}
