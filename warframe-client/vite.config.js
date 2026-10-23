import { defineConfig } from 'vite'
import process from 'node:process'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: Number(process.env.PORT) || 5173,
    // Allow requests that arrive via Tailscale Serve (https://<pc>.<tailnet>.ts.net).
    // Vite rejects unknown Host headers by default; this admits only Tailscale's
    // own domain, not arbitrary hosts. Gu is still behind Google sign-in.
    allowedHosts: ['.ts.net'],
  },
})
