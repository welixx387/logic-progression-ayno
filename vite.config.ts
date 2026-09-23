import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Банк заданий и библиотеки — отдельными файлами, чтобы лучше кэшировались.
        manualChunks: (id) => (id.includes('tasks.json') ? 'tasks' : id.includes('node_modules') ? 'vendor' : undefined),
      },
    },
    chunkSizeWarningLimit: 700,
  },
})
