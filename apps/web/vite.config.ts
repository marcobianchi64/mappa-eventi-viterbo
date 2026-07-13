import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  base: "./",
  resolve: {
    alias: {
      "@atlas/core": resolve(__dirname, "../../packages/core/src/index.ts"),
      "@atlas/supabase-client": resolve(__dirname, "../../packages/supabase-client/src/index.ts"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
