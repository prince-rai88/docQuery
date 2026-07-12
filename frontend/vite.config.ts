import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Django >4.0 strictly checks Origin and Referer headers.
            // Since we can't modify backend CSRF_TRUSTED_ORIGINS, 
            // the proxy must rewrite them to match the target.
            proxyReq.setHeader('Origin', 'http://127.0.0.1:8000');
            proxyReq.setHeader('Referer', 'http://127.0.0.1:8000' + req.url);
          });
        }
      },
      "/media": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
})
