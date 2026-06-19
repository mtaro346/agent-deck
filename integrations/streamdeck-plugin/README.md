# Agent Deck — Elgato Stream Deck plugin

Control and monitor your [agent-deck](https://github.com/asheshgoplani/agent-deck)
AI coding sessions from a physical **Elgato Stream Deck +**, **Stream Deck XL**,
or any other key-based model.

- **Live status on every key** — each key shows a session (title + status colour),
  updated in real time from agent-deck's `/events/menu` event stream.
- **Press to jump in** — opens that session's live web terminal, so you land
  straight in Claude Code / Codex / Gemini.
- **Scales to your hardware** — keys auto-fill by position, so the same setup
  uses 8 keys on a Stream Deck +, 15 on a standard Stream Deck, or all 32 on an
  XL. Keys past the last session simply stay blank.
- **Dial + touch (Stream Deck +)** — rotate the dial to scroll sessions on the
  touch strip, press or tap to open the selected one.

It is a thin client: it talks only to agent-deck's existing local web API
(`http://127.0.0.1:8420` by default) and does **not** modify agent-deck itself.

## How it connects

```
[Stream Deck + / XL]  --USB-->  [Elgato Stream Deck app]
        |  (Elgato SDK websocket)
[this plugin (Node)]  --HTTP + SSE-->  [agent-deck web server :8420]  -->  [your sessions]
```

Because the Elgato app abstracts the hardware, every Stream Deck model — keys,
dials, and the + touch strip — is handled through one codebase.

## Prerequisites

- The **Elgato Stream Deck app** (6.5+).
- **agent-deck** running with its web server enabled:

  ```bash
  agent-deck web              # TUI + web on 127.0.0.1:8420
  # or headless:
  agent-deck web --no-tui
  ```

  On loopback (the default) no token is required.

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

- **Host / Port / Token** — shared connection to agent-deck. Defaults
  `127.0.0.1` / `8420`, token only needed if you exposed agent-deck with
  `--token`.
- **On press** — `Open live terminal` (default), or `Start` / `Stop` / `Restart`.
- **Pin session id** / **Slot index** — optional. Leave both empty for the
  default "auto by key position" behaviour.

### Quick start

1. Drag **Agent Session** onto every key you want to use (e.g. all 32 on an XL).
2. Start agent-deck's web server.
3. Keys light up with your sessions and their live status; press one to open it.
4. On a Stream Deck +, add **Session Dial** to a dial to scroll + open sessions.

## Verifying on real hardware (+ and XL)

1. `npm install && npm run build && npm run link && npm run restart`.
2. Start agent-deck (`agent-deck web`) with at least one session running.
3. **XL**: place Agent Session on several keys — confirm each shows the right
   session, the status colour tracks state changes live, and a press opens the
   web terminal.
4. **Stream Deck +**: place Agent Session on its 8 keys and Session Dial on a
   dial — confirm the touch strip scrolls sessions on rotate and a press/tap
   opens the selected session.

## Tests

```bash
npm test          # unit + mock-server integration tests
npm run validate  # validate the manifest / plugin structure
```

The tests cover status→colour mapping, session parsing (REST + SSE snapshots),
the SSE framing parser, and the API client against a mock agent-deck server
(list, lifecycle POST with CSRF `Origin`, and a live SSE update). Final
on-device behaviour should be confirmed on your Stream Deck + and XL.
