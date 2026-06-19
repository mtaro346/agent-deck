import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AgentDeckClient } from "../src/agentdeck/client";
import type { Session } from "../src/agentdeck/types";

interface RecordedPost {
  url: string;
  origin?: string;
  auth?: string;
}

const posts: RecordedPost[] = [];
let server: Server;
let client: AgentDeckClient;

const MENU_SNAPSHOT = {
  items: [
    { type: "group", group: { name: "work" } },
    { type: "session", session: { id: "x", title: "Xeno", tool: "gemini", status: "idle" } },
  ],
};

function handle(req: IncomingMessage, res: ServerResponse): void {
  const url = req.url ?? "";
  if (req.method === "GET" && url === "/api/sessions") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        sessions: [
          { id: "a", title: "Alpha", tool: "claude", status: "running" },
          { id: "b", title: "Beta", tool: "codex", status: "waiting" },
        ],
      }),
    );
    return;
  }

  if (req.method === "POST" && /^\/api\/sessions\/[^/]+\/[^/]+$/.test(url)) {
    posts.push({
      url,
      origin: req.headers.origin as string | undefined,
      auth: req.headers.authorization as string | undefined,
    });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ sessionId: "a", status: "stopped" }));
    return;
  }

  if (req.method === "GET" && url === "/events/menu") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write(`event: menu\ndata: ${JSON.stringify(MENU_SNAPSHOT)}\n\n`);
    // Stay open; the client unsubscribes when it has what it needs.
    return;
  }

  res.writeHead(404);
  res.end();
}

beforeAll(async () => {
  server = createServer(handle);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as AddressInfo).port;
  client = new AgentDeckClient({ host: "127.0.0.1", port });
});

afterAll(async () => {
  server.closeAllConnections?.();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("AgentDeckClient against a mock agent-deck server", () => {
  it("lists and maps sessions", async () => {
    const sessions = await client.listSessions();
    expect(sessions.map((s) => s.id)).toEqual(["a", "b"]);
    expect(sessions[0]).toMatchObject({ title: "Alpha", tool: "claude", status: "running" });
  });

  it("posts a lifecycle action with a matching Origin header (CSRF)", async () => {
    posts.length = 0;
    await client.runAction("a", "stop");
    expect(posts).toHaveLength(1);
    expect(posts[0].url).toBe("/api/sessions/a/stop");
    expect(posts[0].origin).toBe(client.baseUrl);
  });

  it("receives live sessions over the SSE stream", async () => {
    let stop = (): void => {};
    const sessions = await new Promise<Session[]>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("SSE timed out")), 4000);
      stop = client.streamSessions((s) => {
        clearTimeout(timer);
        resolve(s);
      });
    });
    stop();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({ id: "x", title: "Xeno", status: "idle" });
  });

  it("builds the live terminal URL for a session", () => {
    expect(client.sessionUrl("a")).toBe(`${client.baseUrl}/s/a`);
  });

  it(
    "reconnects after an initial stream failure and stops cleanly",
    async () => {
      let attempts = 0;
      const flaky = createServer((req, res) => {
        if (req.url === "/events/menu") {
          attempts += 1;
          if (attempts === 1) {
            res.writeHead(503);
            res.end();
            return;
          }
          res.writeHead(200, { "Content-Type": "text/event-stream" });
          res.write(`event: menu\ndata: ${JSON.stringify(MENU_SNAPSHOT)}\n\n`);
          return;
        }
        res.writeHead(404);
        res.end();
      });
      await new Promise<void>((resolve) => flaky.listen(0, "127.0.0.1", resolve));
      const port = (flaky.address() as AddressInfo).port;
      const flakyClient = new AgentDeckClient({ host: "127.0.0.1", port });

      let stop = (): void => {};
      const sessions = await new Promise<Session[]>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("did not reconnect")), 9000);
        stop = flakyClient.streamSessions((s) => {
          clearTimeout(timer);
          resolve(s);
        });
      });
      stop();
      flaky.closeAllConnections?.();
      await new Promise<void>((resolve) => flaky.close(() => resolve()));

      expect(attempts).toBeGreaterThanOrEqual(2);
      expect(sessions[0]).toMatchObject({ id: "x" });
    },
    10000,
  );
});
