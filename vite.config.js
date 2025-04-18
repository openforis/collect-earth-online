import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";
import react from "@vitejs/plugin-react";
import resolve from "@rollup/plugin-node-resolve";
import { babel } from "@rollup/plugin-babel";
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// import babel from "@rollup/plugin-babel";

// // https://vitejs.dev/config/
// // TODO add conditions (prod/dev)
export default defineConfig({
  resolve: {
    extensions: [".js", ".jsx", ".ts", ".tsx", ".json", ".svg"],
  },
  server: {
    origin: "http://127.0.0.1:8080",
    hmr: {
      overlay: false,
      nodePolyfills,
    },
  },
  build: {
    chunkSizeWarningLimit: 9000,
    minify: false,
    manifest: true,
    sourcemap: true,
    plugins: [resolve(),
              babel({ exclude: "node_modules/**" }),
              nodePolyfills(),
             ],
    rollupOptions: {
      external: ["react-dom/client"],
      preserveEntrySignatures: "exports-only",
      input: [
        "src/js/about.jsx",
        "src/js/account.jsx",
        "src/js/collection.jsx",
        "src/js/createInstitution.jsx",
        "src/js/geoDash.jsx",
        "src/js/geoDashHelp.jsx",
        "src/js/home.jsx",
        "src/js/institutionDashboard.jsx",
        "src/js/login.jsx",
        "src/js/pageNotFound.jsx",
        "src/js/passwordReset.jsx",
        "src/js/passwordRequest.jsx",
        "src/js/projectAdmin.jsx",
        "src/js/projectDashboard.jsx",
        "src/js/register.jsx",
        "src/js/reviewInstitution.jsx",
        "src/js/simpleCollection.jsx",
        "src/js/support.jsx",
        "src/js/termsOfService.jsx",
        "src/js/userDisagreement.jsx",
        "src/js/verifyEmail.jsx",
        "src/js/widgetLayoutEditor.jsx",
        "src/js/metrics.jsx",
        "src/js/projectQaqcDashboard.jsx"
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
  plugins: [
    svgr({
      exportAsDefault: true,
      svgrOptions: {
        ref: true
        // optionally add more svgr config here
      }
    }),
    nodePolyfills(),
    react({
      fastRefresh: true,
      jsxImportSource: "@emotion/react",
      presets: ["@babel/preset-env", "@babel/preset-react"],
      plugins: [
        // "@vitejs/plugin-react",
        "@babel/plugin-proposal-class-properties",
        "@babel/plugin-transform-runtime",
        "babel-plugin-macros",
        "@emotion",
      ],
    }),
  ],
});
