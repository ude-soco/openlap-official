import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist/webapp",
    // Preserve the browser baseline from Vite 7.
    target: ["chrome107", "edge107", "firefox104", "safari16"],
  },
});
