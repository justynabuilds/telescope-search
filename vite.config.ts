import { defineConfig } from "vite"

// Library build: one script a buyer can drop into any site.
//   dist/telescope-search.js       ESM   (import "…/telescope-search.js")
//   dist/telescope-search.iife.js  classic <script src> for Webflow embeds, WordPress, Squarespace, Shopify…
export default defineConfig({
  build: {
    lib: {
      entry: "src/element/index.ts",
      name: "TelescopeSearch",
      formats: ["es", "iife"],
      fileName: (format) => (format === "es" ? "telescope-search.js" : "telescope-search.iife.js"),
    },
    outDir: "dist",
    emptyOutDir: true,
    target: "es2020",
  },
})
