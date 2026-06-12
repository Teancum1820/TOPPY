import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/TOPPY/",
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Toppy",
        short_name: "Toppy",
        description:
          "Build campaign names and randomized ad lists from a curated inventory.",
        theme_color: "#111c18",
        background_color: "#f4f1e8",
        display: "standalone",
        orientation: "any",
        start_url: "./",
        scope: "./",
        icons: [
          {
            src: "icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,csv}"],
        cleanupOutdatedCaches: true
      }
    })
  ]
});
