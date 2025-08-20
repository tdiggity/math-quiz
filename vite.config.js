import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANT: replace 'math-quiz' with your actual repo name
export default defineConfig({
  plugins: [react()],
  base: '/math-quiz/',
})

