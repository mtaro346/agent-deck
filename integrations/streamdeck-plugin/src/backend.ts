import streamDeck from "@elgato/streamdeck";

import { AgentDeckClient, type SessionAction } from "./agentdeck/client";
import type { Session } from "./agentdeck/types";
import { CmuxClient } from "./cmux/client";

/**
 * A source of sessions for the plugin. The key/dial actions are written against
 * this interface, so the same UI works over agent-deck (HTTP) or cmux (CLI).
 */
export interface Backend {
  /** Begins producing sessions and connection status; returns a stop function. */
  start(onSessions: (sessions: Session[]) => void, onStatus: (connected: boolean) => void): () => void;
  /** Primary action for a key/dial press (switch to / open the session). */
  activate(session: Session): void | Promise<void>;
  /** Optional secondary lifecycle action (agent-deck only). */
  runAction?(session: Session, action: string): Promise<void>;
}

/** agent-deck backend: live SSE updates, press opens the web terminal. */
export class AgentDeckBackend implements Backend {
  constructor(private readonly client: AgentDeckClient) {}

  start(onSessions: (s: Session[]) => void, onStatus: (c: boolean) => void): () => void {
    this.client
      .listSessions()
      .then(onSessions)
      .catch((err) => streamDeck.logger.warn(`initial listSessions failed: ${String(err)}`));
    return this.client.streamSessions(onSessions, onStatus);
  }

  activate(session: Session): void {
    void streamDeck.system.openUrl(this.client.sessionUrl(session.id));
  }

  runAction(session: Session, action: string): Promise<void> {
    return this.client.runAction(session.id, action as SessionAction);
  }
}

/** cmux backend: polls the CLI for workspaces, press switches workspace. */
export class CmuxBackend implements Backend {
  constructor(
    private readonly client: CmuxClient,
    private readonly pollMs = 2000,
  ) {}

  start(onSessions: (s: Session[]) => void, onStatus: (c: boolean) => void): () => void {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async (): Promise<void> => {
      if (stopped) return;
      try {
        const sessions = await this.client.listSessions();
        if (!stopped) {
          onStatus(true);
          onSessions(sessions);
        }
      } catch (err) {
        if (!stopped) {
          onStatus(false);
          streamDeck.logger.warn(`cmux poll failed: ${String(err)}`);
        }
      }
      if (!stopped) timer = setTimeout(() => void tick(), this.pollMs);
    };

    void tick();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }

  activate(session: Session): Promise<void> {
    return this.client.activate(session.id);
  }
}
