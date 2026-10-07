import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const ENCODED_BUS_KEY = 'YzY1NzUwYTEzNjkyNDFlNjAyMGY1NGFkNTY0Mzc4MGI3ZmEzMWNkYWYzMTVkZGEzMzI3MjMwMjJkODE0NWY1ZQ==';
const BUS_SERVICE_KEY = Buffer.from(ENCODED_BUS_KEY, 'base64').toString('utf-8');
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
          const arsId = url.searchParams.get('arsId');
          const stId = url.searchParams.get('stId');
          if (arsId) {
            return `/api/rest/stationinfo/getStationByUid?serviceKey=${BUS_SERVICE_KEY}&arsId=${arsId}&resultType=json`;
          }
          const targetArsId = stId === '100000076' ? '01172' : stId === '100000103' ? '01199' : null;
          if (targetArsId) {
            return `/api/rest/stationinfo/getStationByUid?serviceKey=${BUS_SERVICE_KEY}&arsId=${targetArsId}&resultType=json`;
          }
          return `/api/rest/arrive/getLowArrInfoByStId?serviceKey=${BUS_SERVICE_KEY}&stId=${stId || '100000076'}&resultType=json`;
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
