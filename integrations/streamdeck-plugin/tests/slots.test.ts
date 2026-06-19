import { describe, expect, it } from "vitest";

import { slotIndexOf, toInt, wrapIndex } from "../src/agentdeck/slots";

describe("toInt", () => {
  it("parses numbers and numeric strings", () => {
    expect(toInt(5)).toBe(5);
    expect(toInt("7")).toBe(7);
    expect(toInt(2.9)).toBe(2);
  });

  it("returns undefined for blank or non-numeric input", () => {
    expect(toInt("")).toBeUndefined();
    expect(toInt("  ")).toBeUndefined();
    expect(toInt(undefined)).toBeUndefined();
    expect(toInt("abc")).toBeUndefined();
  });
});

describe("slotIndexOf", () => {
  it("derives the slot from grid position (row * columns + column)", () => {
    expect(slotIndexOf({ column: 3, row: 2 }, 8, {})).toBe(19); // XL: 2*8 + 3
    expect(slotIndexOf({ column: 0, row: 0 }, 5, {})).toBe(0);
    expect(slotIndexOf({ column: 4, row: 1 }, 5, {})).toBe(9); // standard: 1*5 + 4
  });

  it("prefers an explicit slotIndex (number or string)", () => {
    expect(slotIndexOf({ column: 3, row: 2 }, 8, { slotIndex: 7 })).toBe(7);
    expect(slotIndexOf({ column: 3, row: 2 }, 8, { slotIndex: "5" })).toBe(5);
  });

  it("falls back to 0 without coordinates", () => {
    expect(slotIndexOf(undefined, 0, {})).toBe(0);
  });
});

describe("wrapIndex", () => {
  it("wraps forward past the end", () => {
    expect(wrapIndex(2, 1, 3)).toBe(0);
    expect(wrapIndex(0, 5, 3)).toBe(2);
  });

  it("wraps backward past the start", () => {
    expect(wrapIndex(0, -1, 3)).toBe(2);
    expect(wrapIndex(1, -3, 3)).toBe(1);
  });

  it("returns 0 for an empty list", () => {
    expect(wrapIndex(3, 1, 0)).toBe(0);
  });
});
