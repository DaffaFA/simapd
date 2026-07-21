import { Logger, Inject, forwardRef } from '@nestjs/common'
import {
  WebSocketGateway, WebSocketServer,
  OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets'
import { JwtService }    from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { Server, WebSocket } from 'ws'
import { IncomingMessage } from 'http'
import { v4 as uuidv4 }  from 'uuid'

// CATATAN: gunakan port yang berbeda dari HTTP jika ada masalah routing
// Atau hilangkan namespace dan gunakan path filter manual
@WebSocketGateway({
  path: '/stream',
  // namespace DIHAPUS — WsAdapter + namespace bisa konflik di beberapa setup
  // Path '/stream' di-handle manual di handleConnection (lihat di bawah)
  cors: {
    origin: '*',          // izinkan semua origin untuk development
    credentials: false,
  },
})
export class StreamGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server!: Server
  private readonly logger  = new Logger(StreamGateway.name)
  private readonly clients = new Map<WebSocket, string>()  // ws → clientId

  constructor(
    private readonly jwtService:    JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized')
  }

  handleConnection(client: WebSocket, req: IncomingMessage) {
    // ── Step 1: Parse URL dengan aman ───────────────────────────────────────
    let token: string | null = null
    let requestPath = '/'

    try {
      const rawUrl = req.url ?? '/'
      // req.url bisa berupa '/stream?token=...' tanpa host
      // new URL butuh absolute URL, jadi kita tambahkan base dummy
      const base   = `http://${req.headers.host ?? 'localhost'}`
      const parsed = new URL(rawUrl, base)
      token        = parsed.searchParams.get('token')
      requestPath  = parsed.pathname
    } catch (err) {
      this.logger.error(`[WS] URL parse error: ${err}`)
      // Jangan close dulu — coba lanjut dengan token = null
    }

    // ── Step 2: Filter path (ganti namespace yang dihapus) ──────────────────
    // Terima koneksi dari '/stream' atau '/' (untuk backward compat)
    const allowedPaths = ['/stream', '/stream/', '/']
    if (!allowedPaths.includes(requestPath)) {
      this.logger.warn(`[WS] Rejected path: ${requestPath}`)
      try { client.close(1008, 'Wrong path') } catch {}
      return
    }

    // ── Step 3: Verifikasi JWT ───────────────────────────────────────────────
    if (!token) {
      this.logger.warn('[WS] No token provided — closing')
      try {
        client.send(JSON.stringify({ event: 'error', message: 'No token' }))
        client.close(1008, 'Unauthorized')
      } catch {}
      return
    }

    try {
      const secret = this.configService.get<string>('jwt.secret')
      if (!secret) {
        this.logger.error('[WS] JWT secret not configured!')
        client.close(1011, 'Server error')
        return
      }
      this.jwtService.verify(token, { secret })
    } catch (err: any) {
      this.logger.warn(`[WS] JWT verify failed: ${err.message}`)
      try {
        client.send(JSON.stringify({ event: 'error', message: 'Unauthorized' }))
        client.close(1008, 'Unauthorized')
      } catch {}
      return
    }

    // ── Step 4: Client diterima ──────────────────────────────────────────────
    const clientId = uuidv4()
    this.clients.set(client, clientId)
    this.logger.log(`[WS] Client connected: ${clientId} | total: ${this.clients.size}`)

    try {
      client.send(JSON.stringify({
        event:   'system',
        message: 'Connected to SiMAPD stream',
        level:   'info',
      }))
    } catch {}
  }

  handleDisconnect(client: WebSocket) {
    const id = this.clients.get(client) ?? 'unknown'
    this.clients.delete(client)
    this.logger.log(`[WS] Client disconnected: ${id} | remaining: ${this.clients.size}`)
  }

  broadcast(message: object) {
    if (this.clients.size === 0) return  // skip jika tidak ada client
    const payload = JSON.stringify(message)
    const dead: WebSocket[] = []

    this.clients.forEach((_, ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        try { ws.send(payload) } catch { dead.push(ws) }
      } else {
        dead.push(ws)
      }
    })

    dead.forEach(ws => this.clients.delete(ws))
  }

  getConnectionCount(): number { return this.clients.size }
}
