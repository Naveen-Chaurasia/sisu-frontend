import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const BACKEND    = env.BACKEND_URL    || "http://localhost:8000";
  const BACKEND_V2 = env.BACKEND_V2_URL || "http://localhost:8001";

  return {
    plugins: [react()],
    server: {
      port: 5173,
      historyApiFallback: true,
      proxy: {
        "/api":         { target: BACKEND,    changeOrigin: true },
        "/v2":          { target: BACKEND_V2, changeOrigin: true },
        "/mines4":      { target: BACKEND,    changeOrigin: true },
        "/mines":       { target: BACKEND,    changeOrigin: true },
        "/emission-iq": { target: BACKEND,    changeOrigin: true },
      },
    },
  };
});
