# Agent Deck — Elgato Stream Deck plugin

Control and monitor your AI coding sessions from a physical **Elgato Stream Deck +**,
**Stream Deck XL**, or any other key-based model.

Two backends are supported:

- **cmux** (default) — controls your [cmux](https://cmux.app) workspaces. Each key
  is a workspace; **press to switch** cmux to that agent. No tmux required.
- **agent-deck** — connects to an [agent-deck](https://github.com/asheshgoplani/agent-deck)
  web server; press opens the session's live web terminal.

Either way:

- **Live status on every key** — title + status colour (running / waiting / idle),
  updated in real time.
- **Scales to your hardware** — keys auto-fill by position, so the same setup uses
  8 keys on a Stream Deck +, 15 on a standard Stream Deck, or all 32 on an XL.
  Keys past the last session stay blank.
- **Dial + touch (Stream Deck +)** — rotate to scroll sessions on the touch strip,
  press or tap to switch to / open the selected one.

The plugin is a thin client: it talks to cmux via its CLI, or to agent-deck via its
HTTP API. It does not modify either tool.

## How it connects

```
cmux backend:
[Stream Deck +/XL] --USB--> [Elgato app + plugin] --exec--> [cmux CLI] --socket--> [cmux workspaces]

agent-deck backend:
[Stream Deck +/XL] --USB--> [Elgato app + plugin] --HTTP/SSE--> [agent-deck :8420] --> [sessions]
```

## Install (development)

```bash
cd integrations/streamdeck-plugin
npm install
npm run build      # bundles to com.mtaro346.agent-deck.sdPlugin/bin/plugin.js
npm run link       # registers the plugin with the Stream Deck app
npm run restart    # (re)start the plugin
```

`npm run watch` rebuilds on change while developing.

## Configure

Open any **Agent Session** key's settings (or the dial's) in the Stream Deck app:

- **Backend** — `cmux` (default) or `agent-deck`.
- **cmux CLI path** — defaults to `/Applications/cmux.app/Contents/Resources/bin/cmux`.
  A password is only needed if it isn't already saved in cmux Settings.
- **agent-deck host / port / token** — for the agent-deck backend (defaults
  `127.0.0.1` / `8420`).
- **On press** — `Switch to / open` (default). Start / Stop / Restart apply to
  agent-deck only.
- **Pin session id** / **Slot index** — optional; leave empty for "auto by key
  position".

### Quick start (cmux)

1. Make sure cmux is running with a few workspaces.
2. Drag **Agent Session** onto the keys you want (e.g. all 32 on an XL).
3. Each key shows a workspace and its live status; **press one to switch cmux to
   that agent**.
4. On a Stream Deck +, add **Session Dial** to a dial to scroll + switch.

## Tests

```bash
npm test          # unit + mock-server integration tests
npm run validate  # validate the manifest / plugin structure
```

Coverage includes the cmux output parser (workspaces + status, against real
output), status→colour mapping, slot/cursor math, agent-deck session parsing
(REST + SSE), the SSE framing parser, and the agent-deck HTTP client against a
mock server. Final on-device behaviour should be confirmed on your Stream Deck +
and XL.
