/** Settings that influence which session a key shows. */
export interface SlotSettings {
  sessionId?: string;
  slotIndex?: number | string;
}

/** Grid coordinates of a key on a device. */
export interface Coords {
  readonly column: number;
  readonly row: number;
}

/** Parses a value into an integer, or `undefined` when it isn't one. */
export function toInt(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number.parseInt(value, 10);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

/**
 * Resolves a key's 0-based session slot. An explicit `slotIndex` wins; otherwise
 * the slot is derived from the key's grid position (`row * columns + column`),
 * so the same action laid across a device fills sessions left-to-right,
 * top-to-bottom — 8 on a Stream Deck +, 32 on an XL, and so on.
 */
export function slotIndexOf(coords: Coords | undefined, columns: number, settings: SlotSettings): number {
  const explicit = toInt(settings.slotIndex);
  if (explicit !== undefined) return explicit;
  if (coords && columns > 0) return coords.row * columns + coords.column;
  return 0;
}

/** Wraps `current + delta` into `[0, count)`; returns 0 when `count <= 0`. */
export function wrapIndex(current: number, delta: number, count: number): number {
  if (count <= 0) return 0;
  return (((current + delta) % count) + count) % count;
}
