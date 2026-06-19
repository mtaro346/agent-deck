import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import path from "node:path";
import url from "node:url";

const isWatching = !!process.env.ROLLUP_WATCH;
const sdPlugin = "com.mtaro346.agent-deck.sdPlugin";

/**
 * Rollup configuration mirrors the layout produced by `@elgato/cli`:
 * a single ESM bundle emitted to the plugin's `bin/plugin.js`, which the
 * manifest references via `CodePath`.
 */
export default {
  input: "src/plugin.ts",
  output: {
    file: `${sdPlugin}/bin/plugin.js`,
    format: "es",
    sourcemap: isWatching,
    sourcemapPathTransform: (relativeSourcePath) => {
      return url.pathToFileURL(path.resolve(path.dirname(`${sdPlugin}/bin/plugin.js`), relativeSourcePath)).href;
    },
  },
  plugins: [
    typescript({ tsconfig: "./tsconfig.json", sourceMap: isWatching, inlineSources: isWatching }),
    nodeResolve({ browser: false, exportConditions: ["node"], preferBuiltins: true }),
    commonjs(),
  ],
};
