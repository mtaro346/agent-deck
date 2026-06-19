import { statusVisual } from "./status";
import type { Session } from "./types";

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c] as string,
  );
}

/**
 * Builds the SVG drawn on a key for a session. The status colour fills a top
 * bar plus a dot, and the status label sits at the top; the session title is
 * rendered separately via `setTitle` so Stream Deck handles wrapping.
 *
 * Returns `undefined` for an empty slot, which makes the action fall back to
 * the manifest's default "empty" image.
 */
export function sessionKeySvg(session: Session | undefined): string | undefined {
  if (!session) return undefined;
  const v = statusVisual(session.status);
  const tool = escapeXml((session.tool || "").toLowerCase());
  const label = escapeXml(v.label);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">` +
    `<rect width="144" height="144" fill="#16161e"/>` +
    `<rect x="0" y="0" width="144" height="8" fill="${v.color}"/>` +
    `<circle cx="20" cy="34" r="9" fill="${v.color}"/>` +
    `<text x="38" y="40" font-family="-apple-system,Helvetica,Arial,sans-serif" font-size="17" fill="#c0caf5">${label}</text>` +
    `<text x="72" y="130" font-family="-apple-system,Helvetica,Arial,sans-serif" font-size="14" fill="#565f89" text-anchor="middle">${tool}</text>` +
    `</svg>`
  );
}
