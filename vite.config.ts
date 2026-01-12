import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import fs from 'fs';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    base: './', // Essential for Capacitor to load assets from filesystem
    plugins: [
      react(),
      {
        name: 'save-file-endpoint',
        configureServer(server) {
          server.middlewares.use('/__save_file__', (req, res, next) => {
            if (req.method === 'POST') {
              let body = '';
              req.on('data', chunk => body += chunk);
              req.on('end', () => {
                try {
                  const { filename, content } = JSON.parse(body);
                  const safeName = filename.replace(/[:*?"<>|]/g, '_'); // Sanitize for Windows
                  const saveDir = path.resolve(process.cwd(), 'processed_files');

                  // Ensure dir exists
                  if (!fs.existsSync(saveDir)) {
                    fs.mkdirSync(saveDir, { recursive: true });
                  }

                  const filePath = path.join(saveDir, safeName);
                  fs.writeFileSync(filePath, content, 'utf-8');

                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true, path: filePath }));
                } catch (e: any) {
                  console.error('Save file error:', e);
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: e.message }));
                }
              });
            } else {
              next();
            }
          });
        }
      }
    ],
    css: {
      postcss: {
        plugins: [
          tailwindcss,
          autoprefixer,
        ],
      },
    },
    display: 'standalone',
    build: {
      outDir: 'dist',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
