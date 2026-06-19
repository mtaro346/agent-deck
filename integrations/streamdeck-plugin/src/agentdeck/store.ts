import streamDeck from "@elgato/streamdeck";

import { AgentDeckClient, type SessionAction } from "./client";
import { resolveConnection, type GlobalSettings, type Session } from "./types";

type Listener = () => void;

/**
 * Single source of truth for the plugin: holds the live session list, owns the
 * connection to agent-deck, and notifies actions when anything changes. Both
 * the key and dial actions read from — and subscribe to — this one instance.
 */
class AgentDeckStore {
  private client = new AgentDeckClient(resolveConnection(undefined));
  private sessions: readonly Session[] = [];
  private readonly listeners = new Set<Listener>();
  private stopStream?: () => void;
  private listAbort?: AbortController;
  private connected = false;
  private started = false;
  /** Bumped on every (re)connect so stale async results can be ignored. */
  private generation = 0;
  /** `host:port:token` of the active connection; used to skip no-op reconnects. */
  private connKey = "";

  /** Sessions in agent-deck's order. */
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

  /** Starts the initial fetch + stream once. Subsequent calls are no-ops. */
  start(): void {
    if (this.started) return;
    this.started = true;
    void this.configure();
  }

  /** (Re)reads global settings and reconnects. Safe to call repeatedly. */
  async configure(settings?: GlobalSettings): Promise<void> {
    const resolved = settings ?? ((await streamDeck.settings.getGlobalSettings()) as GlobalSettings);
    const conn = resolveConnection(resolved);
    const key = `${conn.host}:${conn.port}:${conn.token ?? ""}`;
    // onDidReceiveGlobalSettings also fires on plain reads (e.g. when a property
    // inspector opens), so only reconnect when the connection actually changes.
    if (key === this.connKey && this.stopStream) return;
    this.connKey = key;
    this.client = new AgentDeckClient(conn);
    this.reconnect();
  }

  async runAction(id: string, action: SessionAction): Promise<void> {
    await this.client.runAction(id, action);
  }

  openSession(id: string): void {
    void streamDeck.system.openUrl(this.client.sessionUrl(id));
  }

  private reconnect(): void {
    this.stopStream?.();
    this.listAbort?.abort();
    this.connected = false;

    const generation = ++this.generation;
    const client = this.client;
    const abort = new AbortController();
    this.listAbort = abort;

    client
      .listSessions(abort.signal)
      .then((sessions) => {
        if (generation === this.generation) this.setSessions(sessions);
      })
      .catch((err) => {
        if (generation === this.generation) {
          streamDeck.logger.warn(`initial listSessions failed: ${String(err)}`);
        }
      });

    this.stopStream = client.streamSessions(
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
