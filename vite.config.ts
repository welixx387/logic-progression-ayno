import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  // Ключи Supabase берём из .env.local или из переменных хостинга. Интеграция
  // Supabase в Vercel называет их SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY и т. п. —
  // подходят любые из этих названий. В сайт попадают только адрес и публичный ключ.
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  const pick = (...names: string[]) => names.map((n) => env[n]?.trim()).find(Boolean) ?? ''
  const url = pick('VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL')
  const anonKey = pick(
    'VITE_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_ANON_KEY',
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_PUBLISHABLE_KEY',
  )

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(url),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(anonKey),
    },
    build: {
      rollupOptions: {
        output: {
          // Банк заданий и библиотеки — отдельными файлами, чтобы лучше кэшировались.
          manualChunks: (id) => (id.includes('tasks.json') ? 'tasks' : id.includes('node_modules') ? 'vendor' : undefined),
        },
      },
      chunkSizeWarningLimit: 700,
    },
  }
})
