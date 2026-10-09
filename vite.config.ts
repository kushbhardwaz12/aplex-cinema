import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    root: '.',
    build: {
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        input: path.resolve(__dirname, 'index.html'),
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('firebase')) return 'firebase-vendor';
              if (id.includes('react')) return 'react-vendor';
              if (id.includes('motion')) return 'motion-vendor';
              if (id.includes('lucide')) return 'lucide-vendor';
              return 'vendor';
            }
          }
        }
      },
    },
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'api-server-middleware',
        configureServer(server) {
          server.middlewares.use('/api/ai-extract-movie', async (req, res) => {
            if (req.method === 'OPTIONS') {
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
              res.statusCode = 200;
              return res.end();
            }
            if (req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', async () => {
                try {
                  const handler = (await import('./api/ai-extract-movie.js')).default;
                  const fakeRes = {
                    setHeader(k, v) { res.setHeader(k, v); },
                    status(code) { res.statusCode = code; return this; },
                    json(data) {
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify(data));
                    },
                    end() { res.end(); }
                  };
                  await handler({ ...req, body }, fakeRes);
                } catch (err) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: err.message }));
                }
              });
            } else {
              res.statusCode = 405;
              res.end('Method Not Allowed');
            }
          });
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // Explicitly disable HMR to prevent websocket errors in AI Studio iframe/proxy
      hmr: false,
    },
  };
});
