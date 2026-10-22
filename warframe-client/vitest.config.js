import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// UI interaction tests only (tests/ui). The dependency-free Node suite in
// tests/*.test.js keeps running under `npm test` and is not touched by this.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true, // lets Testing Library auto-clean the DOM between tests
    include: ['tests/ui/**/*.test.jsx'],
    restoreMocks: true,
  },
})
