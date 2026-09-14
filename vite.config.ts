import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv, Plugin } from 'vite';

export default defineConfig(({ mode, command }) => {
  // Load .env.local / .env so GEMINI_API_KEY is available in the server plugin process
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  const plugins: Plugin[] = [react(), tailwindcss()];

  // Only mount the local Express dev API middleware during 'vite' (local dev mode).
  // During 'vite build', NEVER import or execute server/apiRouter.js.
  if (command === 'serve') {
    plugins.push({
      name: 'goodzeed-api-server',
      async configureServer(server) {
        const { default: express } = await import('express');
        const { default: apiRouter } = await import('./server/apiRouter.js');
        const apiApp = express();
        apiApp.use(express.json({ limit: '50mb' }));
        apiApp.use(express.urlencoded({ extended: true, limit: '50mb' }));
        apiApp.use('/api', apiRouter);
        apiApp.use('/uploads', express.static(path.resolve(process.cwd(), 'public/uploads')));
        server.middlewares.use(apiApp);
      }
    });
  }

  return {
    plugins,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      // Always ignore data/ and public/uploads/ to prevent page flicker when persisting data or uploading media.
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: ['**/data/**', '**/public/uploads/**']
      },
    },
  };
});
