import path from "path"
import react from "@vitejs/plugin-react"
import { serwist } from "@serwist/vite"
import { defineConfig } from "vitest/config"

// O plugin Serwist gera o service worker no build. Fora do Vitest para não
// interferir na suíte de testes.
const pwaPlugins = process.env.VITEST
  ? []
  : [
      serwist({
        swSrc: "src/sw.ts",
        swDest: "sw.js",
        globDirectory: "dist",
        injectionPoint: "self.__SW_MANIFEST",
        rollupFormat: "iife",
      }),
    ]

export default defineConfig({
  plugins: [react(), ...pwaPlugins],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
  },
})
