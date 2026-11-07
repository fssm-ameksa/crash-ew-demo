import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Pure static React app: all data lives in public/data (built by scripts/export_static.py).
// base './' lets the built site run from any folder or sub-path (e.g. GitHub Pages).
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5173 },
})
