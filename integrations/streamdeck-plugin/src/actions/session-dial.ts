import streamDeck, { action, SingletonAction, type DialRotateEvent } from "@elgato/streamdeck";

import { wrapIndex } from "../agentdeck/slots";
import { statusVisual, truncateTitle } from "../agentdeck/status";
import { store } from "../agentdeck/store";

/**
 * A dial (Stream Deck +) that scrolls the agent-deck session list on its touch
 * display. Rotating moves a cursor through the fleet; pressing or tapping opens
 * the selected session's live web terminal.
 */
@action({ UUID: "com.mtaro346.agent-deck.dial" })
export class SessionDialAction extends SingletonAction {
  private subscribed = false;
  private cursor = 0;

  override onWillAppear(): Promise<void> {
    if (!this.subscribed) {
      this.subscribed = true;
      store.subscribe(() => void this.renderAll());
    }
    return this.renderAll();
  }

  override onDialRotate(ev: DialRotateEvent): Promise<void> {
    this.cursor = wrapIndex(this.cursor, ev.payload.ticks, store.getSessions().length);
    return this.renderAll();
  }

  override onDialDown(): void {
    this.open();
  }

  override onTouchTap(): void {
    this.open();
  }

  private open(): void {
    const session = store.getByIndex(this.cursor);
    if (session) {
      void store.activate(session).catch((err) => streamDeck.logger.error(`dial activate failed: ${String(err)}`));
    }
  }

  private async renderAll(): Promise<void> {
    const count = store.getSessions().length;
    this.cursor = count === 0 ? 0 : Math.min(this.cursor, count - 1);
    const session = store.getByIndex(this.cursor);

    for (const a of this.actions) {
      if (!a.isDial()) continue;
      await a.setFeedbackLayout("$B1");
      if (session) {
        await a.setFeedback({
          title: truncateTitle(session.title || session.tool || session.id, 22),
          value: statusVisual(session.status).label,
          indicator: count > 1 ? Math.round((this.cursor / (count - 1)) * 100) : 100,
        });
      } else {
        await a.setFeedback({
          title: "agent-deck",
          value: store.isConnected() ? "no sessions" : "offline",
          indicator: 0,
        });
      }
    }
  }
}
