import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

/**
 * Конфигурация Vite.
 * Алиас '@' указывает на каталог src — короче импорты и удобнее рефакторинг.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  // Изолируем PostCSS: не позволяем Vite искать конфиг в родительских каталогах.
  css: {
    postcss: {},
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
  },
});
