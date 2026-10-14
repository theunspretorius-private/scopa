import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomInt } from 'node:crypto';
import { WebSocketServer, type WebSocket } from 'ws';
import { TARGET_SCORES } from '../src/engine/match';
import { isCardId } from '../src/engine/cards';
import type { Seat } from '../src/engine/round';
import { EMOTES, ROOM_ID_RE, type ClientMsg, type CreateRoomResponse, type RoomConfig, type ServerMsg } from '../src/net/protocol';
import { Room } from './room';

const PORT = Number(process.env.PORT ?? 8787);
const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DIST = join(ROOT, 'dist');
const ROOM_IDLE_MS = 30 * 60_000;
const MAX_ROOMS = 5000;

const rooms = new Map<string, Room>();
const sockets = new Map<Room, [WebSocket | null, WebSocket | null]>();

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
function newRoomId(): string {
  for (;;) {
    let id = '';
    for (let i = 0; i < 6; i++) id += ALPHABET[randomInt(ALPHABET.length)];
    if (!rooms.has(id)) return id;
  }
}

const cleanName = (v: unknown): string =>
  typeof v === 'string' ? v.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 20) : '';

function sendTo(room: Room, seat: Seat, msg: ServerMsg) {
  const ws = sockets.get(room)?.[seat];
  if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

function createRoom(body: Record<string, unknown>): CreateRoomResponse {
  const target = TARGET_SCORES.includes(body.target as never) ? (body.target as RoomConfig['target']) : 11;
  const turnSeconds = ([0, 15, 30] as const).includes(body.turnSeconds as never) ? (body.turnSeconds as RoomConfig['turnSeconds']) : 30;
  const config: RoomConfig = { target, turnSeconds, inspector: body.inspector !== false };
  const id = newRoomId();
  const room = new Room(id, config, cleanName(body.name) || 'Player 1', (seat, msg) => sendTo(room, seat, msg));
  rooms.set(id, room);
  sockets.set(room, [null, null]);
  return { room: id, token: room.hostToken };
}

// ------------------------------------------------------------------ HTTP

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.map': 'application/json',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage, limit = 4096): Promise<Record<string, unknown>> {
  return new Promise((ok, fail) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > limit) {
        fail(new Error('too large'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      try {
        const v = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        ok(v && typeof v === 'object' ? v : {});
      } catch (e) {
        fail(e);
      }
    });
    req.on('error', fail);
  });
}

/** Universal Links / App Links. Configure with APPLE_TEAM_ID and ANDROID_SHA256 env vars. */
function wellKnown(path: string, res: ServerResponse): boolean {
  if (path === '/.well-known/apple-app-site-association') {
    json(res, 200, {
      applinks: { details: [{ appIDs: [`${process.env.APPLE_TEAM_ID ?? 'TEAMID'}.game.scopa.mobile`], components: [{ '/': '/m/*' }] }] },
    });
    return true;
  }
  if (path === '/.well-known/assetlinks.json') {
    json(res, 200, [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: 'game.scopa.mobile',
          sha256_cert_fingerprints: (process.env.ANDROID_SHA256 ?? '').split(',').filter(Boolean),
        },
      },
    ]);
    return true;
  }
  return false;
}

function serveStatic(path: string, req: IncomingMessage, res: ServerResponse) {
  if (!existsSync(DIST)) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Client not built. Run `npm run build`, or use `npm run dev` for development.');
    return;
  }
  const safe = normalize(decodeURIComponent(path)).replace(/^(\.\.[/\\])+/, '');
  let file = join(DIST, safe);
  if (file.startsWith(DIST) && existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html'); // static pages (/how-to-play-scopa/)
  if (!file.startsWith(DIST) || !existsSync(file) || statSync(file).isDirectory()) file = join(DIST, 'index.html'); // SPA fallback (/m/:room)
  const ext = extname(file);
  const size = statSync(file).size;
  const headers = {
    'content-type': MIME[ext] ?? 'application/octet-stream',
    'cache-control': file.includes(`${join(DIST, 'assets')}`) ? 'public, max-age=31536000, immutable' : 'no-cache',
    'accept-ranges': 'bytes',
  };
  // Range requests: Safari won't play video or audio without them.
  const range = /^bytes=(d*)-(d*)$/.exec(req.headers.range ?? '');
  if (range && (range[1] || range[2])) {
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) {
      res.writeHead(416, { 'content-range': `bytes */${size}` });
      return void res.end();
    }
    res.writeHead(206, { ...headers, 'content-range': `bytes ${start}-${end}/${size}`, 'content-length': end - start + 1 });
    return void createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(200, { ...headers, 'content-length': size });
  createReadStream(file).pipe(res);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  try {
    if (req.method === 'POST' && url.pathname === '/api/rooms') {
      if (rooms.size >= MAX_ROOMS) return json(res, 503, { error: 'busy' });
      return json(res, 201, createRoom(await readBody(req)));
    }
    if (req.method === 'GET' && url.pathname.startsWith('/api/rooms/')) {
      const room = rooms.get(url.pathname.slice('/api/rooms/'.length));
      if (!room) return json(res, 404, { error: 'room_not_found' });
      return json(res, 200, { room: room.id, config: room.config, full: !!room.seats[1], host: room.seats[0]?.name });
    }
    if (req.method === 'GET' && url.pathname === '/api/health') return json(res, 200, { ok: true, rooms: rooms.size });
    if (req.method === 'GET' && wellKnown(url.pathname, res)) return;
    if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(url.pathname, req, res);
    json(res, 405, { error: 'method' });
  } catch {
    json(res, 400, { error: 'bad_request' });
  }
});

// ------------------------------------------------------------------ WebSocket

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 4096 });

function parse(raw: unknown): ClientMsg | null {
  try {
    const m = JSON.parse(String(raw));
    if (!m || typeof m !== 'object' || typeof m.t !== 'string') return null;
    switch (m.t) {
      case 'hello':
        return typeof m.room === 'string' && ROOM_ID_RE.test(m.room)
          ? { t: 'hello', room: m.room, token: typeof m.token === 'string' ? m.token.slice(0, 64) : undefined, name: cleanName(m.name) }
          : null;
      case 'play': {
        const mv = m.move;
        if (!mv || !isCardId(mv.cardId) || !Array.isArray(mv.capture) || mv.capture.length > 10 || !mv.capture.every(isCardId)) return null;
        return { t: 'play', move: { cardId: mv.cardId, capture: mv.capture } };
      }
      case 'emote':
        return EMOTES.includes(m.id) ? { t: 'emote', id: m.id } : null;
      case 'continue':
      case 'rematch':
      case 'ping':
        return { t: m.t };
      default:
        return null;
    }
  } catch {
    return null;
  }
}

wss.on('connection', (ws) => {
  let room: Room | null = null;
  let seat: Seat | null = null;
  const reply = (msg: ServerMsg) => ws.readyState === ws.OPEN && ws.send(JSON.stringify(msg));

  let alive = true;
  ws.on('pong', () => (alive = true));
  const hb = setInterval(() => {
    if (!alive) return ws.terminate();
    alive = false;
    ws.ping();
  }, 15_000);

  ws.on('message', (raw) => {
    const msg = parse(raw);
    if (!msg) return reply({ t: 'error', code: 'bad_message' });
    if (msg.t === 'ping') return reply({ t: 'pong' });

    if (msg.t === 'hello') {
      if (room) return;
      const r = rooms.get(msg.room);
      if (!r) return reply({ t: 'error', code: 'room_not_found' });
      const j = r.join(msg.token, msg.name);
      if ('error' in j) return reply({ t: 'error', code: j.error });
      room = r;
      seat = j.seat;
      const pair = sockets.get(r)!;
      const prev = pair[seat];
      pair[seat] = ws;
      if (prev && prev !== ws) prev.close(4000, 'replaced'); // newest connection wins
      reply({ t: 'welcome', seat, token: j.token, room: r.id, config: r.config });
      r.connect(seat);
      return;
    }

    if (!room || seat === null) return reply({ t: 'error', code: 'bad_message' });
    switch (msg.t) {
      case 'play': {
        const err = room.play(seat, msg.move);
        if (err) reply(err);
        break;
      }
      case 'continue':
        room.continueRound(seat);
        break;
      case 'rematch':
        room.rematch(seat);
        break;
      case 'emote':
        room.emote(seat, msg.id);
        break;
    }
  });

  ws.on('close', () => {
    clearInterval(hb);
    if (!room || seat === null) return;
    const pair = sockets.get(room);
    if (pair && pair[seat] === ws) {
      pair[seat] = null;
      room.disconnect(seat);
    }
  });
});

setInterval(() => {
  const now = Date.now();
  for (const [id, room] of rooms) {
    if (room.connectedCount === 0 && now - room.lastActivity > ROOM_IDLE_MS) {
      room.dispose();
      rooms.delete(id);
      sockets.delete(room);
    }
  }
}, 60_000).unref();

server.listen(PORT, () => console.log(`Scopa server listening on http://localhost:${PORT}`));
