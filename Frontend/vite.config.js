import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backend = env.VITE_API_PROXY_TARGET || "http://localhost:8000";

  return {
    plugins: [react()],
    resolve: {
      alias: { "@": path.resolve(process.cwd(), "src") },
    },
    server: {
      port: 5173,
      proxy: {
        "/api": { target: backend, changeOrigin: true },
      },
    },
  };
});
