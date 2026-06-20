import { execFile } from "node:child_process";

import type { Session } from "../agentdeck/types";
import { mapCmuxState, parseStatus, parseWorkspaces } from "./parse";

const DEFAULT_CMUX_BIN = "/Applications/cmux.app/Contents/Resources/bin/cmux";
const EXEC_TIMEOUT_MS = 5000;

export interface CmuxConfig {
  /** Path to the `cmux` CLI. Defaults to the bundled app binary. */
  bin?: string;
  /** Socket password; only needed if not saved in cmux Settings. */
  password?: string;
}

/**
 * Talks to a local cmux instance by shelling out to its CLI (which speaks to
 * cmux's Unix socket). Each cmux workspace is surfaced as a {@link Session}.
 */
export class CmuxClient {
  private readonly bin: string;
  private readonly password?: string;

  constructor(cfg: CmuxConfig = {}) {
    this.bin = cfg.bin?.trim() || DEFAULT_CMUX_BIN;
    this.password = cfg.password?.trim() || undefined;
  }

  private run(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const env: NodeJS.ProcessEnv = { ...process.env };
      if (this.password) env.CMUX_SOCKET_PASSWORD = this.password;
      // Drop any inherited cmux context so explicit --workspace targets win.
      delete env.CMUX_WORKSPACE_ID;
      delete env.CMUX_SURFACE_ID;
      delete env.CMUX_TAB_ID;

      execFile(this.bin, args, { env, timeout: EXEC_TIMEOUT_MS, maxBuffer: 1 << 20 }, (err, stdout) => {
        if (err) reject(err);
        else resolve(stdout);
      });
    });
  }

  async ping(): Promise<boolean> {
    try {
      await this.run(["ping"]);
      return true;
    } catch {
      return false;
    }
  }

  /** Lists cmux workspaces, each with its agent status, in display order. */
  async listSessions(): Promise<Session[]> {
    const rows = parseWorkspaces(await this.run(["list-workspaces"]));
    return Promise.all(
      rows.map(async (row): Promise<Session> => {
        let status = "idle";
        try {
          status = mapCmuxState(parseStatus(await this.run(["list-status", "--workspace", row.ref])).state);
        } catch {
          // A workspace without a status line stays "idle".
        }
        return { id: row.ref, title: row.title || row.ref, tool: "claude", status };
      }),
    );
  }

  /** Switches cmux to the given workspace (brings that agent to the front). */
  async activate(ref: string): Promise<void> {
    await this.run(["select-workspace", "--workspace", ref]);
  }
}
