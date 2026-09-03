import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/V2-MEDCODE/' : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src'),
    },
  },
  server: {
    // true = listen on 0.0.0.0 so Cursor port-forward and LAN clients can connect.
    host: true,
    port: 5173,
    strictPort: true,
    // Cursor cloud / mobile previews send *.cursorvm.com (and other forwarded Host headers).
    allowedHosts: true,
    cors: true,
  },
  preview: {
    host: true,
    port: 4173,
    strictPort: true,
    allowedHosts: true,
    cors: true,
  },
});
