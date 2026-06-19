/** A decoded Server-Sent Event. */
export interface SseEvent {
  readonly event: string;
  readonly data: string;
}

/**
 * Incremental parser for the Server-Sent Events wire format. Feed it raw text
 * chunks via {@link push}; complete events are delivered to the callback.
 *
 * It is pure and synchronous (no I/O), so the framing logic can be unit-tested
 * by pushing strings — including chunks split mid-line.
 */
export class SseParser {
  private buffer = "";
  private event = "";
  private data: string[] = [];

  constructor(private readonly onEvent: (ev: SseEvent) => void) {}

  push(chunk: string): void {
    this.buffer += chunk;
    let nl: number;
    while ((nl = this.buffer.indexOf("\n")) >= 0) {
      let line = this.buffer.slice(0, nl);
      this.buffer = this.buffer.slice(nl + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      this.handleLine(line);
    }
  }

  private handleLine(line: string): void {
    if (line === "") {
      if (this.data.length > 0) {
        this.onEvent({ event: this.event || "message", data: this.data.join("\n") });
      }
      this.event = "";
      this.data = [];
      return;
    }
    if (line.startsWith(":")) return; // comment / keepalive

    const idx = line.indexOf(":");
    const field = idx < 0 ? line : line.slice(0, idx);
    let value = idx < 0 ? "" : line.slice(idx + 1);
    if (value.startsWith(" ")) value = value.slice(1);

    if (field === "event") this.event = value;
    else if (field === "data") this.data.push(value);
    // `id` and `retry` are intentionally ignored.
  }
}
