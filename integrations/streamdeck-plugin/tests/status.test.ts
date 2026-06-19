import { describe, expect, it } from "vitest";

import { sessionKeySvg } from "../src/agentdeck/render";
import { statusVisual, truncateTitle } from "../src/agentdeck/status";

describe("statusVisual", () => {
  it("maps known statuses to distinct colours and labels", () => {
    expect(statusVisual("running").label).toBe("running");
    expect(statusVisual("running").color).toBe("#9ece6a");
    expect(statusVisual("waiting").color).toBe("#e0af68");
    expect(statusVisual("error").color).toBe("#f7768e");
  });

  it("is case-insensitive", () => {
    expect(statusVisual("RUNNING").color).toBe(statusVisual("running").color);
  });

  it("falls back to an unknown treatment for empty or unrecognised statuses", () => {
    expect(statusVisual(undefined).label).toBe("?");
    expect(statusVisual("").label).toBe("?");
    expect(statusVisual("banana").label).toBe("?");
  });
});

describe("truncateTitle", () => {
  it("leaves short titles untouched", () => {
    expect(truncateTitle("short")).toBe("short");
  });

  it("truncates long titles with an ellipsis", () => {
    const out = truncateTitle("a-very-long-session-title-here", 10);
    expect(out).toHaveLength(10);
    expect(out.endsWith("…")).toBe(true);
  });
});

describe("sessionKeySvg", () => {
  it("returns undefined for an empty slot", () => {
    expect(sessionKeySvg(undefined)).toBeUndefined();
  });

  it("embeds the status colour for a session", () => {
    const svg = sessionKeySvg({ id: "a", title: "Alpha", tool: "claude", status: "running" });
    expect(svg).toContain("<svg");
    expect(svg).toContain("#9ece6a");
    expect(svg).toContain("running");
  });

  it("escapes the tool name", () => {
    const svg = sessionKeySvg({ id: "a", title: "A", tool: "a<b>", status: "idle" });
    expect(svg).toContain("a&lt;b&gt;");
  });
});
