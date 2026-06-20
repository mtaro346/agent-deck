import { describe, expect, it } from "vitest";

import { mapCmuxState, parseStatus, parseWorkspaces, stripGlyph } from "../src/cmux/parse";

// Real `cmux list-workspaces` output (Japanese titles, spinner/attention glyphs).
const LIST_WORKSPACES = [
  "* workspace:16  ✳ Stream Deck + XL 対応アップデート  [selected]",
  "  workspace:17  ⠂ 結婚準備プロジェクトのディレクトリ構造設計",
  "  workspace:11  ✳ 松山市観光周遊企画のシステム設計",
  "  workspace:7  ⠐ Rust プロジェクトの GUI と機能仕様の検討",
  "  workspace:15  ssff改善",
  "  workspace:8  ✳ 社内チャットツールへのAIエージェント統合",
  "  workspace:9  ✳ カラーズクリエーション向けプレスリリース素案作成",
].join("\n");

describe("parseWorkspaces", () => {
  it("parses all workspaces in order with refs and titles", () => {
    const rows = parseWorkspaces(LIST_WORKSPACES);
    expect(rows.map((r) => r.ref)).toEqual([
      "workspace:16",
      "workspace:17",
      "workspace:11",
      "workspace:7",
      "workspace:15",
      "workspace:8",
      "workspace:9",
    ]);
  });

  it("strips leading status glyphs from titles", () => {
    const rows = parseWorkspaces(LIST_WORKSPACES);
    expect(rows[0].title).toBe("Stream Deck + XL 対応アップデート");
    expect(rows[1].title).toBe("結婚準備プロジェクトのディレクトリ構造設計");
  });

  it("keeps titles that have no glyph", () => {
    const rows = parseWorkspaces(LIST_WORKSPACES);
    expect(rows[4].title).toBe("ssff改善");
  });

  it("marks the selected workspace", () => {
    const rows = parseWorkspaces(LIST_WORKSPACES);
    expect(rows[0].selected).toBe(true);
    expect(rows.filter((r) => r.selected)).toHaveLength(1);
  });
});

describe("stripGlyph", () => {
  it("removes a leading glyph but not interior symbols", () => {
    expect(stripGlyph("✳ Hello")).toBe("Hello");
    expect(stripGlyph("⠂ World")).toBe("World");
    expect(stripGlyph("plain")).toBe("plain");
    expect(stripGlyph("A ✳ B")).toBe("A ✳ B");
  });
});

describe("parseStatus", () => {
  it("parses single-word and multi-word states with colour", () => {
    expect(parseStatus("claude_code=Running icon=bolt.fill color=#4C8DFF")).toEqual({
      state: "Running",
      color: "#4C8DFF",
    });
    expect(parseStatus("claude_code=Needs input icon=bell.fill color=#4C8DFF")).toEqual({
      state: "Needs input",
      color: "#4C8DFF",
    });
    expect(parseStatus("claude_code=Idle icon=pause.circle.fill color=#8E8E93")).toEqual({
      state: "Idle",
      color: "#8E8E93",
    });
  });

  it("returns an empty state for blank input", () => {
    expect(parseStatus("").state).toBe("");
  });
});

describe("mapCmuxState", () => {
  it("normalises cmux states into the plugin vocabulary", () => {
    expect(mapCmuxState("Running")).toBe("running");
    expect(mapCmuxState("Needs input")).toBe("waiting");
    expect(mapCmuxState("Idle")).toBe("idle");
  });
});
