/**
 * A single agent-deck session, reduced to the fields the plugin renders.
 * Mapped from both `GET /api/sessions` and the `/events/menu` SSE snapshot.
 */
export interface Session {
  readonly id: string;
  readonly title: string;
  readonly tool: string;
  readonly status: string;
  readonly substate?: string;
  readonly groupPath?: string;
}

/** Resolved connection details for the agent-deck web server. */
export interface ConnectionConfig {
  readonly host: string;
  readonly port: number;
  readonly token?: string;
}

/** Plugin-wide settings, persisted by the property inspector as global settings. */
export interface GlobalSettings {
  /** Which source to read sessions from. Defaults to cmux. */
  backend?: "cmux" | "agentdeck";
  /** Path to the cmux CLI (cmux backend). */
  cmuxBin?: string;
  /** cmux socket password, only if not saved in cmux Settings. */
  cmuxPassword?: string;
  /** agent-deck host (agentdeck backend). */
  host?: string;
  /** Stored as a string by the property inspector; coerced on read. */
  port?: number | string;
  token?: string;
}

export const DEFAULT_HOST = "127.0.0.1";
export const DEFAULT_PORT = 8420;

/**
 * Normalises raw global settings into a usable connection. Defaults to the
 * agent-deck loopback address, where no auth token is required.
 */
export function resolveConnection(settings: GlobalSettings | undefined): ConnectionConfig {
  const host = settings?.host?.trim() || DEFAULT_HOST;
  const portNum = Number(settings?.port);
  const port = Number.isFinite(portNum) && portNum > 0 ? Math.trunc(portNum) : DEFAULT_PORT;
  const token = settings?.token?.trim() || undefined;
  return { host, port, token };
}
