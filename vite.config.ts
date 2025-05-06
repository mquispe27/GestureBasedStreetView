import vue from "@vitejs/plugin-vue";
import { join } from "path";
import { defineConfig, loadEnv } from "vite";
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [
      nodePolyfills({
        include: ['events'], // Explicitly polyfill events module
        globals: { Buffer: true }
      }),
      vue()
    ],
    base: "/",
    define: {
      "process.env": env,
    },
    resolve: {
      alias: {
        "@": join(__dirname, "client"),
      },
    },
    server: {
      proxy: {
        "/api": {
          target: "http://localhost:3000",
          changeOrigin: true,
        },
      },
    },
  };
});

