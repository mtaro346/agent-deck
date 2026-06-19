import { describe, expect, it } from "vitest";

import { mapSession, parseMenuSnapshot, parseSessionsResponse } from "../src/agentdeck/parse";
import { SseParser } from "../src/agentdeck/sse";

describe("mapSession", () => {
  it("maps the documented fields and falls back name -> title", () => {
    const s = mapSession({ id: "x", name: "Named", tool: "claude", status: "running" });
    expect(s).toMatchObject({ id: "x", title: "Named", tool: "claude", status: "running" });
  });

  it("tolerates missing fields", () => {
    const s = mapSession({});
    expect(s.id).toBe("");
    expect(s.title).toBe("");
  });
});

describe("parseSessionsResponse", () => {
  it("parses the REST shape and drops id-less rows", () => {
    const out = parseSessionsResponse({
      sessions: [
        { id: "a", title: "Alpha", tool: "claude", status: "running" },
        { title: "no id" },
      ],
    });
    expect(out.map((s) => s.id)).toEqual(["a"]);
  });

  it("returns [] for malformed input", () => {
    expect(parseSessionsResponse(null)).toEqual([]);
    expect(parseSessionsResponse({})).toEqual([]);
  });
});

describe("parseMenuSnapshot", () => {
  it("extracts sessions from a menu snapshot, skipping groups and preserving order", () => {
    const out = parseMenuSnapshot({
      items: [
        { type: "group", group: { name: "work" } },
        { type: "session", session: { id: "b", title: "Beta", tool: "codex", status: "waiting" } },
        { type: "session", session: { id: "a", title: "Alpha", tool: "claude", status: "running" } },
      ],
    });
    expect(out.map((s) => s.id)).toEqual(["b", "a"]);
    expect(out[0].status).toBe("waiting");
  });
});

describe("SseParser", () => {
  it("decodes a complete event", () => {
    const events: { event: string; data: string }[] = [];
    const p = new SseParser((e) => events.push(e));
    p.push("event: menu\ndata: {\"ok\":true}\n\n");
    expect(events).toEqual([{ event: "menu", data: '{"ok":true}' }]);
  });

  it("reassembles events split across chunks and ignores keepalive comments", () => {
    const events: { event: string; data: string }[] = [];
    const p = new SseParser((e) => events.push(e));
    p.push(": keepalive\n\n");
    p.push("event: men");
    p.push("u\ndata: 1\nda");
    p.push("ta: 2\n\n");
    expect(events).toEqual([{ event: "menu", data: "1\n2" }]);
  });

  it("handles CRLF line endings", () => {
    const events: { event: string; data: string }[] = [];
    const p = new SseParser((e) => events.push(e));
    p.push("data: hi\r\n\r\n");
    expect(events).toEqual([{ event: "message", data: "hi" }]);
  });
});
