import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "path"

export default defineConfig({
  base: "/edit-excel-csv/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          univer: ["@univerjs/presets", "@univerjs/preset-sheets-core"],
          sheetjs: ["xlsx"],
          exceljs: ["exceljs"],
          jspdf: ["jspdf", "jspdf-autotable"],
          encoding: ["encoding-japanese"],
        },
      },
    },
  },
})
