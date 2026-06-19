import { parseMenuSnapshot, parseSessionsResponse } from "./parse";
import { SseParser } from "./sse";
import type { ConnectionConfig, Session } from "./types";

/** Lifecycle actions agent-deck exposes via `POST /api/sessions/{id}/{action}`. */
export type SessionAction = "start" | "stop" | "restart" | "close" | "archive" | "unarchive" | "fork";

/**
 * Thin client for the agent-deck local web API. It never mutates agent-deck's
 * core — it only consumes the documented HTTP + SSE surface.
 */
export class AgentDeckClient {
  constructor(private readonly cfg: ConnectionConfig) {}

  get baseUrl(): string {
    return `http://${this.cfg.host}:${this.cfg.port}`;
  }

  /** URL of a session's live web terminal. */
  sessionUrl(id: string): string {
    return `${this.baseUrl}/s/${encodeURIComponent(id)}`;
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    const h: Record<string, string> = { ...extra };
    if (this.cfg.token) h.Authorization = `Bearer ${this.cfg.token}`;
    return h;
  }

  /** Fetches the current session list (initial render before the stream warms up). */
  async listSessions(signal?: AbortSignal): Promise<Session[]> {
    const res = await fetch(`${this.baseUrl}/api/sessions`, { headers: this.headers(), signal });
    if (!res.ok) throw new Error(`GET /api/sessions failed: ${res.status}`);
    return parseSessionsResponse(await res.json());
  }

  /** Runs a lifecycle action on a session. */
  async runAction(id: string, action: SessionAction, signal?: AbortSignal): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/sessions/${encodeURIComponent(id)}/${action}`, {
      method: "POST",
      // agent-deck's CSRF check requires Origin/Referer to match the host.
      headers: this.headers({ "Content-Type": "application/json", Origin: this.baseUrl }),
      signal,
    });
    if (!res.ok) throw new Error(`POST /api/sessions/${id}/${action} failed: ${res.status}`);
  }

  /**
   * Subscribes to the live `/events/menu` stream. Calls {@link onSessions} with
   * the latest session list on every snapshot, and {@link onStatus} as the
   * connection comes and goes. Reconnects with exponential backoff until the
   * returned stop function is called.
   */
  streamSessions(onSessions: (sessions: Session[]) => void, onStatus?: (connected: boolean) => void): () => void {
    const controller = new AbortController();
    let stopped = false;
    const url = `${this.baseUrl}/events/menu`;

    const run = async (): Promise<void> => {
      let backoff = 1000;
      while (!stopped) {
        try {
          const res = await fetch(url, {
            headers: this.headers({ Accept: "text/event-stream" }),
            signal: controller.signal,
          });
          if (!res.ok || !res.body) throw new Error(`SSE connect failed: ${res.status}`);
          onStatus?.(true);
          backoff = 1000;

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          const parser = new SseParser((ev) => {
            if (ev.event !== "menu" && ev.event !== "message") return;
            try {
              onSessions(parseMenuSnapshot(JSON.parse(ev.data)));
            } catch {
              // Ignore a malformed frame; the next snapshot will recover.
            }
          });

          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            parser.push(decoder.decode(value, { stream: true }));
          }
        } catch {
          if (stopped) break;
        }
        onStatus?.(false);
        if (stopped) break;
        await delay(backoff, controller.signal);
        backoff = Math.min(backoff * 2, 15000);
      }
    };

    void run();
    return () => {
      stopped = true;
      controller.abort();
    };
  }
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const onAbort = (): void => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      // Remove the abort listener so repeated reconnects don't accumulate
      // listeners on the long-lived signal.
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}
