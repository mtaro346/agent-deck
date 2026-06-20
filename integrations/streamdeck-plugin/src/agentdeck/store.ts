import streamDeck from "@elgato/streamdeck";

import { AgentDeckBackend, type Backend, CmuxBackend } from "../backend";
import { CmuxClient } from "../cmux/client";
import { AgentDeckClient } from "./client";
import { resolveConnection, type GlobalSettings, type Session } from "./types";

type Listener = () => void;

/**
 * Single source of truth for the plugin: owns the active {@link Backend}
 * (cmux or agent-deck), holds the live session list, and notifies actions on
 * change. Both the key and dial actions read from — and subscribe to — this
 * one instance.
 */
class AgentDeckStore {
  private backend: Backend = new CmuxBackend(new CmuxClient());
  private sessions: readonly Session[] = [];
  private readonly listeners = new Set<Listener>();
  private stop?: () => void;
  private connected = false;
  private started = false;
  /** Bumped on every (re)connect so stale async results can be ignored. */
  private generation = 0;
  /** Identity of the active backend+config; used to skip no-op reconnects. */
  private connKey = "";

  getSessions(): readonly Session[] {
    return this.sessions;
  }

  getByIndex(index: number): Session | undefined {
    return index >= 0 && index < this.sessions.length ? this.sessions[index] : undefined;
  }

  getById(id: string): Session | undefined {
    return this.sessions.find((s) => s.id === id);
  }

  isConnected(): boolean {
    return this.connected;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  /** Starts once. Subsequent calls are no-ops. */
  start(): void {
    if (this.started) return;
    this.started = true;
    void this.configure();
  }

  /** (Re)reads global settings and reconnects when the backend/config changes. */
  async configure(settings?: GlobalSettings): Promise<void> {
    const resolved = settings ?? ((await streamDeck.settings.getGlobalSettings()) as GlobalSettings);
    const kind = resolved.backend === "agentdeck" ? "agentdeck" : "cmux";

    let key: string;
    let backend: Backend;
    if (kind === "cmux") {
      const bin = (resolved.cmuxBin ?? "").trim();
      const password = (resolved.cmuxPassword ?? "").trim();
      key = `cmux:${bin}:${password}`;
      backend = new CmuxBackend(new CmuxClient({ bin, password }));
    } else {
      const conn = resolveConnection(resolved);
      key = `ad:${conn.host}:${conn.port}:${conn.token ?? ""}`;
      backend = new AgentDeckBackend(new AgentDeckClient(conn));
    }

    // onDidReceiveGlobalSettings also fires on plain reads (e.g. when a property
    // inspector opens), so only reconnect when something actually changed.
    if (key === this.connKey && this.stop) return;
    this.connKey = key;
    this.backend = backend;
    this.reconnect();
  }

  /** Primary press action: switch to (cmux) / open (agent-deck) the session. */
  async activate(session: Session): Promise<void> {
    await this.backend.activate(session);
  }

  /** Secondary action; falls back to {@link activate} when unsupported. */
  async runAction(session: Session, action: string): Promise<void> {
    if (this.backend.runAction) await this.backend.runAction(session, action);
    else await this.backend.activate(session);
  }

  private reconnect(): void {
    this.stop?.();
    this.connected = false;
    // Drop any sessions from the previous backend so a switch can't leave stale
    // keys (or route presses to the new backend with old session ids).
    this.setSessions([]);
    const generation = ++this.generation;
    this.stop = this.backend.start(
      (sessions) => {
        if (generation === this.generation) this.setSessions(sessions);
      },
      (connected) => {
        if (generation === this.generation) {
          this.connected = connected;
          this.notify();
        }
      },
    );
  }

  private setSessions(sessions: readonly Session[]): void {
    this.sessions = sessions;
    this.notify();
  }

  private notify(): void {
    for (const fn of this.listeners) {
      try {
        fn();
      } catch (err) {
        streamDeck.logger.error(`store listener failed: ${String(err)}`);
      }
    }
  }
}

export const store = new AgentDeckStore();
