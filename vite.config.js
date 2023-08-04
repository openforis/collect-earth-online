import resolve from "@rollup/plugin-node-resolve";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import svgr from "vite-plugin-svgr";

// import babel from "@rollup/plugin-babel";

// // https://vitejs.dev/config/
// // TODO add conditions (prod/dev)
export default defineConfig({
  server: {
    origin: "http://127.0.0.1:8080",
    hmr: {
      overlay: false,
    },
  },
  publicDir: "./resources/public",
  build: {
    chunkSizeWarningLimit: 9000,
    minify: true,
    manifest: true,
    sourcemap: true,
    plugins: [resolve()],
    rollupOptions: {
      // external: ["react-dom/client"],
      preserveEntrySignatures: "exports-only",
      input: [
        "./src/js/about.jsx",
        "./src/js/account.jsx",
        "./src/js/collection.jsx",
        "./src/js/createInstitution.jsx",
        "./src/js/geoDash.jsx",
        "./src/js/geoDashHelp.jsx",
        "./src/js/home.jsx",
        "./src/js/institutionDashboard.jsx",
        "./src/js/login.jsx",
        "./src/js/pageNotFound.jsx",
        "./src/js/passwordReset.jsx",
        "./src/js/passwordRequest.jsx",
        "./src/js/projectAdmin.jsx",
        "./src/js/projectDashboard.jsx",
        "./src/js/register.jsx",
        "./src/js/reviewInstitution.jsx",
        "./src/js/simpleCollection.jsx",
        "./src/js/support.jsx",
        "./src/js/termsOfService.jsx",
        "./src/js/userDisagreement.jsx",
        "./src/js/verifyEmail.jsx",
        "./src/js/widgetLayoutEditor.jsx"
      ],
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
  plugins: [react({ jsxImportSource: "@emotion/react" }),
                        svgr()],
});
