import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_TRAVEL_API_BASE_URL || 'http://localhost:9200'

  return {
    plugins: [vue()],
    server: {
      port: 1420,
      strictPort: true,
 allowedHosts: ['travel.code688.com'],
      proxy: {
        // 本地存储模式的媒体文件（/uploads/...）代理到 merchant-upload-api
        '/uploads': {
          target: 'http://localhost:9208',
          changeOrigin: true,
        },
        // IM 网关（imGateway）：同源 WebSocket 长连接 + HTTP 接口（与生产 nginx /ws、/im 代理对齐）
        '/ws': {
          target: 'http://localhost:9281',
          ws: true,
          changeOrigin: true,
        },
        '/im': {
          target: 'http://localhost:9281',
          changeOrigin: true,
        },
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
