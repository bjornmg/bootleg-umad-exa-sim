import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/bootleg-umad-exa-sim/', // IMPORTANT: This must match your repo name
})
