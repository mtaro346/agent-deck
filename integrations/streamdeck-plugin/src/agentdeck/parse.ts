import type { Session } from "./types";

/** Maps a raw session object (from REST or SSE) into a {@link Session}. */
export function mapSession(raw: unknown): Session {
  const r = (raw ?? {}) as Record<string, unknown>;
  const str = (v: unknown): string => (v === undefined || v === null ? "" : String(v));
  return {
    id: str(r.id),
    title: str(r.title ?? r.name),
    tool: str(r.tool),
    status: str(r.status),
    substate: r.substate ? str(r.substate) : undefined,
    groupPath: r.groupPath ? str(r.groupPath) : undefined,
  };
}

/** Parses the body of `GET /api/sessions` into a session list. */
export function parseSessionsResponse(json: unknown): Session[] {
  const sessions = (json as { sessions?: unknown })?.sessions;
  if (!Array.isArray(sessions)) return [];
  return sessions.map(mapSession).filter((s) => s.id !== "");
}

/**
 * Parses a `/events/menu` MenuSnapshot into a session list, preserving
 * agent-deck's ordering and skipping group rows.
 */
export function parseMenuSnapshot(json: unknown): Session[] {
  const items = (json as { items?: unknown })?.items;
  if (!Array.isArray(items)) return [];
  return items
    .filter((it): it is { type: string; session: unknown } => {
      const o = it as { type?: unknown; session?: unknown };
      return o?.type === "session" && o?.session !== undefined && o?.session !== null;
    })
    .map((it) => mapSession(it.session))
    .filter((s) => s.id !== "");
}
