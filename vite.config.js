import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { apiMiddleware } from './server/api.js'

function solbayApi() {
  const mount = (req, res, next) => {
    apiMiddleware(req, res, next)
  }
  return {
    name: 'solbay-api',
    configureServer(server) {
      server.middlewares.use('/api', mount)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api', mount)
    },
  }
}

export default defineConfig({
  plugins: [react(), solbayApi()],
  server: { port: 5173, host: true },
  preview: { port: 4173, host: true },
})
