// NYANDAK realtime service (socket.io) — port 3030
// Tugas: 1) teruskan event dari API (POST /emit) ke room yang tepat
//        2) jalankan sweep aturan bisnis tiap 30 detik
import { createServer } from 'http'
import { Server } from 'socket.io'

const PORT = 3030
const INTERNAL_KEY = 'nyandak-internal-1'

const httpServer = createServer()

const io = new Server(httpServer, {
  path: '/', // JANGAN diubah — dipakai Caddy buat forwarding
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// socket.io path '/' menyadap SEMUA request — sisipkan handler /emit
// di depan listener engine.io supaya API Next bisa kirim event ke room.
const engineListeners = httpServer.listeners('request')
httpServer.removeAllListeners('request')
httpServer.on('request', (req, res) => {
  if (req.method === 'POST' && req.url === '/emit') {
    if (req.headers['x-nyandak-key'] !== INTERNAL_KEY) {
      res.writeHead(403).end('forbidden')
      return
    }
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', () => {
      try {
        const { rooms, event, data } = JSON.parse(body)
        for (const room of rooms || []) io.to(room).emit(event, data)
        res.writeHead(200).end('ok')
      } catch {
        res.writeHead(400).end('bad json')
      }
    })
    return
  }
  for (const l of engineListeners) (l as (a: unknown, b: unknown) => void)(req, res)
})

io.on('connection', (socket) => {
  socket.on('subscribe', (p: { userId?: string; role?: string; orderId?: string }) => {
    if (p?.userId) socket.join(`user:${p.userId}`)
    if (p?.role) socket.join(`role:${p.role}`)
    if (p?.orderId) socket.join(`order:${p.orderId}`)
  })
  socket.on('unsubscribe-order', (orderId: string) => {
    if (orderId) socket.leave(`order:${orderId}`)
  })
})

// ── sweep aturan bisnis tiap 30 detik ──
async function runSweep() {
  try {
    const mod = await import('../../src/lib/sweep')
    const done = await mod.sweep()
    if (done.length > 0) {
      console.log('[sweep]', done.join(', '))
      io.to('role:KURIR').emit('orders:refresh', {})
      io.to('role:ADMIN').emit('admin:refresh', { reason: 'sweep' })
    }
  } catch (e) {
    console.error('[sweep-error]', e?.message || e)
  }
}
setInterval(runSweep, 30_000)
setTimeout(runSweep, 5_000)

httpServer.listen(PORT, () => console.log(`NYANDAK socket service jalan di :${PORT}`))
