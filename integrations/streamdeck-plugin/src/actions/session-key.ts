import streamDeck, { action, SingletonAction, type KeyDownEvent } from "@elgato/streamdeck";

import type { SessionAction } from "../agentdeck/client";
import { sessionKeySvg } from "../agentdeck/render";
import { type Coords, slotIndexOf } from "../agentdeck/slots";
import { truncateTitle } from "../agentdeck/status";
import { store } from "../agentdeck/store";
import type { Session } from "../agentdeck/types";

/** Per-key settings, persisted by the property inspector. */
interface KeySettings {
  /** Pin to a specific session id; takes priority over the slot index. */
  sessionId?: string;
  /** 0-based slot; when unset, derived from the key's position in the grid. */
  slotIndex?: number | string;
  /** What a press does. Defaults to opening the live web terminal. */
  press?: "open" | SessionAction;
}

/**
 * A key bound to an agent-deck session. By default a key shows the session at
 * its own grid position (slot), so dropping the action across an XL's 32 keys
 * lays the whole fleet out automatically; unbound keys stay blank. A press
 * opens the session's live web terminal (or runs a lifecycle action).
 */
@action({ UUID: "com.mtaro346.agent-deck.session" })
export class SessionKeyAction extends SingletonAction {
  private subscribed = false;

  override onWillAppear(): Promise<void> {
    if (!this.subscribed) {
      this.subscribed = true;
      store.subscribe(() => void this.renderAll());
    }
    return this.renderAll();
  }

  override onDidReceiveSettings(): Promise<void> {
    return this.renderAll();
  }

  override async onKeyDown(ev: KeyDownEvent): Promise<void> {
    const settings = ev.payload.settings as KeySettings;
    const session = resolveSession(ev.action.coordinates, ev.action.device.size.columns, settings);
    if (!session) {
      await ev.action.showAlert();
      return;
    }

    const press = settings.press ?? "open";
    try {
      if (press === "open") {
        await store.activate(session);
      } else {
        await store.runAction(session, press);
      }
      await ev.action.showOk();
    } catch (err) {
      streamDeck.logger.error(`session key press failed: ${String(err)}`);
      await ev.action.showAlert();
    }
  }

  /** Re-renders every visible key instance of this action. */
  private async renderAll(): Promise<void> {
    for (const a of this.actions) {
      if (!a.isKey()) continue;
      const settings = (await a.getSettings()) as KeySettings;
      const session = resolveSession(a.coordinates, a.device.size.columns, settings);
      await a.setImage(sessionKeySvg(session));
      await a.setTitle(session ? truncateTitle(session.title || session.tool || session.id) : "");
    }
  }
}

function resolveSession(coords: Coords | undefined, columns: number, settings: KeySettings): Session | undefined {
  if (settings.sessionId) return store.getById(settings.sessionId);
  return store.getByIndex(slotIndexOf(coords, columns, settings));
}
