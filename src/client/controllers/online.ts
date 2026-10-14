import type { Seat } from '../../engine/round';
import type { Move } from '../../engine/rules';
import type { ClientMsg, EmoteId, GameView, ServerMsg } from '../../net/protocol';
import { serverOrigin } from '../native';
import { roomToken } from '../settings';
import { Emitter, type ConnStatus, type GameController } from './types';

/** Thin client: the server owns the game. Reconnects automatically using the stored seat token. */
export class OnlineController implements GameController {
  readonly kind = 'online' as const;
  readonly difficulty = null;
  view: GameView | null = null;
  seat: Seat | null = null;
  private ws: WebSocket | null = null;
  private views = new Emitter<[GameView]>();
  private emotes = new Emitter<[Seat, EmoteId]>();
  private statuses = new Emitter<[ConnStatus]>();
  private status: ConnStatus = { kind: 'connecting' };
  private disposed = false;
  private retries = 0;
  private retryTimer: number | null = null;
  private pingTimer: number | null = null;
  private fatal = false;

  constructor(
    readonly room: string,
    private name: string,
  ) {
    window.addEventListener('online', this.kick);
    document.addEventListener('visibilitychange', this.kick);
    this.connect();
  }

  private kick = () => {
    if (document.visibilityState === 'visible' && !this.ws && !this.disposed && !this.fatal) {
      if (this.retryTimer) clearTimeout(this.retryTimer);
      this.connect();
    }
  };

  private setStatus(s: ConnStatus) {
    this.status = s;
    this.statuses.emit(s);
  }

  private connect() {
    this.retryTimer = null;
    const url = `${serverOrigin().replace(/^http/, 'ws')}/ws`;
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      return this.scheduleRetry();
    }
    this.ws = ws;
    ws.onopen = () => {
      this.retries = 0;
      this.send({ t: 'hello', room: this.room, token: roomToken.get(this.room), name: this.name });
      this.pingTimer = window.setInterval(() => this.send({ t: 'ping' }), 20_000);
    };
    ws.onmessage = (e) => {
      let msg: ServerMsg;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      this.handle(msg);
    };
    ws.onclose = () => {
      if (this.pingTimer) clearInterval(this.pingTimer);
      this.pingTimer = null;
      if (this.ws === ws) this.ws = null;
      if (!this.disposed && !this.fatal) this.scheduleRetry();
    };
  }

  private scheduleRetry() {
    this.setStatus({ kind: this.view ? 'reconnecting' : 'connecting' });
    const delay = Math.min(8000, 500 * 2 ** this.retries++);
    this.retryTimer = window.setTimeout(() => this.connect(), delay);
  }

  private handle(msg: ServerMsg) {
    switch (msg.t) {
      case 'welcome':
        this.seat = msg.seat;
        roomToken.set(msg.room, msg.token);
        break;
      case 'waiting':
        this.setStatus({ kind: 'waiting', room: msg.room, config: msg.config });
        break;
      case 'state':
        if (this.status.kind !== 'ok') this.setStatus({ kind: 'ok' });
        this.view = msg.view;
        this.views.emit(msg.view);
        break;
      case 'emote':
        this.emotes.emit(msg.from, msg.id);
        break;
      case 'error':
        if (msg.code === 'room_not_found' || msg.code === 'room_full') {
          this.fatal = true;
          this.setStatus({ kind: 'error', code: msg.code });
          this.ws?.close();
        }
        break;
    }
  }

  private send(msg: ClientMsg) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  subscribe(fn: (v: GameView) => void) {
    const off = this.views.on(fn);
    if (this.view) fn(this.view);
    return off;
  }
  onEmote(fn: (from: Seat, id: EmoteId) => void) {
    this.emotes.on(fn);
  }
  onStatus(fn: (s: ConnStatus) => void) {
    this.statuses.on(fn);
    fn(this.status);
  }
  play(move: Move) {
    this.send({ t: 'play', move });
  }
  continueRound() {
    this.send({ t: 'continue' });
  }
  rematch() {
    this.send({ t: 'rematch' });
  }
  emote(id: EmoteId) {
    this.send({ t: 'emote', id });
  }
  dispose() {
    this.disposed = true;
    window.removeEventListener('online', this.kick);
    document.removeEventListener('visibilitychange', this.kick);
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.ws?.close();
    this.views.clear();
    this.emotes.clear();
    this.statuses.clear();
  }
}
