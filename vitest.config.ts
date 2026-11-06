import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    // Existing demo-isolation journeys intentionally exercise credential-free
    // legacy email demo accounts. Keep their fixture mode independent of the
    // enabled production username-auth Vite flags in .env. Production signup
    // is separately covered by auth handler tests and browser smoke tests.
    env: {
      VITE_USERNAME_AUTH_ENABLED: "false",
      VITE_PUBLIC_REGISTRATION_ENABLED: "false",
      VITE_BETA_INVITES_ENABLED: "false",
    },
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "react-router-dom": path.resolve(__dirname, "./src/lib/router-compat.tsx"),
    },
  },
});
