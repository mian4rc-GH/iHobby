import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"]
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  },
  // nodemailer is an optional peer dependency not installed in dev;
  // mark it external so Vite doesn't try to resolve it during tests.
  build: {
    rollupOptions: {
      external: ["nodemailer"]
    }
  },
  optimizeDeps: {
    exclude: ["nodemailer"]
  }
});
