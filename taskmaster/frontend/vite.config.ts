// Compile Vue files and proxy development API requests to the backend.
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  server: { proxy: { "/api": "http://localhost:3000", "/health": "http://localhost:3000" } },
});
