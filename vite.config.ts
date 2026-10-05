import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const BUS_SERVICE_KEY = 'c65750a1369241e6020f54ad5643780b7fa31cdaf315dda332723022d8145f5e';
const SUBWAY_SERVICE_KEY = '67585365716c62653635714e6c7652';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api/bus': {
        target: 'http://ws.bus.go.kr',
        changeOrigin: true,
        rewrite: (path) => {
          const url = new URL(path, 'http://localhost');
          const stId = url.searchParams.get('stId') || '100000076';
          return `/api/rest/arrive/getLowArrInfoByStId?serviceKey=${BUS_SERVICE_KEY}&stId=${stId}&resultType=json`;
        },
      },
      '/api/subway': {
        target: 'http://swopenapi.seoul.go.kr',
        changeOrigin: true,
        rewrite: (path) => {
          const url = new URL(path, 'http://localhost');
          const station = url.searchParams.get('station') || '안국';
          return `/api/subway/${SUBWAY_SERVICE_KEY}/json/realtimeStationArrival/1/10/${encodeURIComponent(station)}`;
        },
      },
    },
  },
});
