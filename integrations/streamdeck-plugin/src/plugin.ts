import streamDeck from "@elgato/streamdeck";

import { SessionDialAction } from "./actions/session-dial";
import { SessionKeyAction } from "./actions/session-key";
import { store } from "./agentdeck/store";
import type { GlobalSettings } from "./agentdeck/types";

streamDeck.actions.registerAction(new SessionKeyAction());
streamDeck.actions.registerAction(new SessionDialAction());

// Reconnect whenever the connection settings change in any property inspector.
streamDeck.settings.onDidReceiveGlobalSettings((ev) => {
  void store.configure(ev.settings as GlobalSettings);
});

await streamDeck.connect();
store.start();
