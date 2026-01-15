import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import fs from 'fs';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig(({ mode }) => {
  // Manual .env loading to ensure stability
  const envManual = {};
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach(line => {
      const cleanLine = line.split('#')[0].trim();
      if (!cleanLine) return;
      const parts = cleanLine.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        let value = parts.slice(1).join('=').trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        envManual[key] = value;
      }
    });
  }

  const envLoad = loadEnv(mode, process.cwd(), '');
  const env = { ...envManual, ...envLoad }; // Merge, preferring loadEnv if it works, but manual as backup

  console.log(`[Vite] Manual Env Loaded: ${Object.keys(envManual).length} keys`);
  console.log(`[Vite] Supabase URL: ${env.VITE_SUPABASE_URL ? 'FOUND' : 'MISSING'}`);

  // Platform-specific Google Maps API Key selection
  const getPlatformApiKey = () => {
    const platform = process.env.CAPACITOR_PLATFORM || process.env.PLATFORM;

    if (platform === 'ios' || platform === 'android') {
      // iOS/Android Capacitor webview: use Production/WebView key (OPQI)
      return process.env.VITE_GOOGLE_MAPS_API_KEY_WEBVIEW || env.VITE_GOOGLE_MAPS_API_KEY_WEBVIEW;
    } else {
      // Web/Localhost: use Local Test key (GKOm4)
      return process.env.VITE_GOOGLE_MAPS_API_KEY_LOCAL_TEST || env.VITE_GOOGLE_MAPS_API_KEY_LOCAL_TEST;
    }
  };

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    base: './', // Essential for Capacitor to load assets from filesystem
    define: {
      // FORCE: Hard-replace these variables during build to bypass .env loading issues on CI
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY),
      'import.meta.env.VITE_KAKAO_API_KEY': JSON.stringify(process.env.VITE_KAKAO_API_KEY || env.VITE_KAKAO_API_KEY),
      'import.meta.env.VITE_NAVER_CLIENT_ID': JSON.stringify(process.env.VITE_NAVER_CLIENT_ID || env.VITE_NAVER_CLIENT_ID),
      // Inject both just in case, but code should prefer getPlatformApiKey()
      'import.meta.env.VITE_GOOGLE_MAPS_API_KEY_LOCAL_TEST': JSON.stringify(process.env.VITE_GOOGLE_MAPS_API_KEY_LOCAL_TEST || env.VITE_GOOGLE_MAPS_API_KEY_LOCAL_TEST),
      'import.meta.env.VITE_GOOGLE_MAPS_API_KEY_WEBVIEW': JSON.stringify(process.env.VITE_GOOGLE_MAPS_API_KEY_WEBVIEW || env.VITE_GOOGLE_MAPS_API_KEY_WEBVIEW),
      // Standardize usage via this key
      'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(getPlatformApiKey()),
      'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(process.env.VITE_GOOGLE_CLIENT_ID || env.VITE_GOOGLE_CLIENT_ID),
    },
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
      target: 'es2015', // Ensuring compatibility with iOS 13+
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
