import { createServer } from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { apiMiddleware } from './server/api.js'

const root = path.dirname(fileURLToPath(import.meta.url))
const dist = path.join(root, 'dist')
const port = Number(process.env.PORT || 4173)

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
}

function sendFile(res, file) {
  res.statusCode = 200
  res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream')
  fs.createReadStream(file).pipe(res)
}

createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://localhost')
  if (url.pathname.startsWith('/api')) {
    apiMiddleware(req, res, () => {
      res.statusCode = 404
      res.end('Not found')
    })
    return
  }
  const safe = path.normalize(url.pathname).replace(/^(\.\.[/\\])+/, '')
  const file = path.join(dist, safe)
  if (file.startsWith(dist) && fs.existsSync(file) && fs.statSync(file).isFile()) {
    sendFile(res, file)
    return
  }
  const index = path.join(dist, 'index.html')
  if (fs.existsSync(index)) sendFile(res, index)
  else {
    res.statusCode = 503
    res.end('Build the app first with npm run build.')
  }
}).listen(port, () => {
  console.log(`SolbayTea delivery is running at http://localhost:${port}`)
})
