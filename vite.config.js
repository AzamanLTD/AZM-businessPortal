import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    // Playwright browser E2E lives in e2e/ with its own runner — keep the two suites from importing each other.
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
  },
})
