import resolve from "@rollup/plugin-node-resolve";
import { defineConfig, splitVendorChunkPlugin } from "vite";
import react from "@vitejs/plugin-react-swc";

// import babel from "@rollup/plugin-babel";

// // https://vitejs.dev/config/
// // TODO add conditions (prod/dev)
export default defineConfig({
  server: {
    origin: "http://127.0.0.1:8080",
    hmr: {
      overlay: true,
    },
  },
  publicDir: "./resources/public",
  build: {
    chunkSizeWarningLimit: 9000,
    minify: true,
    manifest: true,
    sourcemap: false,
    plugins: [resolve()],
    rollupOptions: {
      // external: ["react-dom/client"],
      preserveEntrySignatures: "exports-only",
      input: ["./src/js/home.jsx"],
      output: {
        // compact: false,
        // sourcemap: true,
        // entryFileNames: "[name].js",
        // preserveModules: true,
        // minifyInternalExports: false,
        dir: "dist/public",
      },
    },
  },
  plugins: [react({ jsxImportSource: "@emotion/react" })],
});
