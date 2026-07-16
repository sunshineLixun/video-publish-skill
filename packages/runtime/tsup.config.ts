import { defineConfig } from "tsup";

export default defineConfig({
  banner: {
    js: "#!/usr/bin/env node",
  },
  bundle: true,
  clean: true,
  dts: false,
  entry: {
    "video-publish": "src/cli.ts",
  },
  format: ["esm"],
  noExternal: ["@video-publish/core", "zod"],
  outDir: "dist",
  sourcemap: true,
  target: "node20",
});
