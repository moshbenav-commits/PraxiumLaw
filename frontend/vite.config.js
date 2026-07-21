import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Keep reading REACT_APP_* env vars (in addition to Vite's own VITE_*)
  // so the existing Vercel/production env var contract (REACT_APP_BACKEND_URL,
  // set outside this repo) doesn't need to be renamed. Access via
  // import.meta.env.REACT_APP_BACKEND_URL instead of process.env.
  envPrefix: ["VITE_", "REACT_APP_"],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    // Keep CRA's output layout so vercel.json (outputDirectory: "build",
    // and the "/((?!static/).*)" SPA rewrite) keeps working unchanged.
    outDir: "build",
    assetsDir: "static",
  },
  server: {
    port: 3000,
  },
  preview: {
    port: 3000,
  },
});
