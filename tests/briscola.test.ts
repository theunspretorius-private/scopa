import { describe, expect, it } from 'vitest';
import { chooseMove, DIFFICULTIES, observe } from '../src/ai';
import {
  applyMove,
  briscolaBeats,
  cardById,
  dealRound,
  FULL_DECK,
  isLegalMove,
  legalMoves,
  mulberry32,
  newMatch,
  nextRound,
  playMove,
  scoreBriscolaRound,
  sumBriscolaPoints,
  type PlayerRound,
  type RoundState,
  type Seat,
} from '../src/engine';
import { Room, type Clock } from '../server/room';
import type { GameView, ServerMsg } from '../src/net/protocol';

const C = (...ids: string[]) => ids.map(cardById);

describe('Briscola cards & rules', () => {
  it('sums to 120 total deck points and orders strength 1 > 3 > 10 > 9 > 8 > 7 > 6 > 5 > 4 > 2', () => {
    expect(sumBriscolaPoints(FULL_DECK)).toBe(120);
    expect(cardById('DENARI_1').briscolaValue).toBe(11);
    expect(cardById('SPADE_3').briscolaValue).toBe(10);
    expect(cardById('COPPE_10').briscolaValue).toBe(4);
    expect(cardById('BASTONI_9').briscolaValue).toBe(3);
    expect(cardById('DENARI_8').briscolaValue).toBe(2);
    expect(cardById('SPADE_7').briscolaValue).toBe(0);

    const ranks = [1, 3, 10, 9, 8, 7, 6, 5, 4, 2] as const;
    for (let i = 0; i < ranks.length - 1; i++) {
      const stronger = cardById(`DENARI_${ranks[i]}`);
      const weaker = cardById(`DENARI_${ranks[i + 1]}`);
      expect(stronger.briscolaStrength).toBeGreaterThan(weaker.briscolaStrength);
    }
  });

  it('evaluates trick winner with briscolaBeats', () => {
    // Same suit: 3 beats Re, Asso beats 3
    expect(briscolaBeats(cardById('COPPE_10'), cardById('COPPE_3'), 'DENARI')).toBe(true);
    expect(briscolaBeats(cardById('COPPE_1'), cardById('COPPE_3'), 'DENARI')).toBe(false);
    // Different non-trump suit: follower never beats leader even with an Ace
    expect(briscolaBeats(cardById('COPPE_2'), cardById('SPADE_1'), 'DENARI')).toBe(false);
    // Non-trump lead vs trump follow: any trump wins
    expect(briscolaBeats(cardById('COPPE_1'), cardById('DENARI_2'), 'DENARI')).toBe(true);
    // Trump lead vs higher/lower trump follow
    expect(briscolaBeats(cardById('DENARI_3'), cardById('DENARI_1'), 'DENARI')).toBe(true);
    expect(briscolaBeats(cardById('DENARI_3'), cardById('DENARI_10'), 'DENARI')).toBe(false);
  });

  it('deals 3 cards each, 0 on table, 34 in stock with face-up trump card at bottom of stock', () => {
    const r = dealRound(0, mulberry32(7), 'briscola');
    expect(r.game).toBe('briscola');
    expect(r.players[0].hand).toHaveLength(3);
    expect(r.players[1].hand).toHaveLength(3);
    expect(r.table).toHaveLength(0);
    expect(r.deck).toHaveLength(34);
    expect(r.trumpCard).not.toBeNull();
    expect(r.trumpCard?.id).toBe(r.deck[r.deck.length - 1].id);
    expect(r.trumpSuit).toBe(r.trumpCard?.suit);
    expect(r.turn).toBe(1);
  });

  it('allows any card in hand with empty capture in Briscola', () => {
    const hand = C('SPADE_7', 'DENARI_1');
    const table = C('SPADE_7');
    const moves = legalMoves(hand, table, 'briscola');
    expect(moves).toEqual([
      { cardId: 'SPADE_7', capture: [] },
      { cardId: 'DENARI_1', capture: [] },
    ]);
    expect(isLegalMove(hand, table, { cardId: 'SPADE_7', capture: ['SPADE_7'] }, 'briscola')).toBe(false);
    expect(isLegalMove(hand, table, { cardId: 'SPADE_7', capture: [] }, 'briscola')).toBe(true);
  });
});

describe('Briscola trick resolution, drawing & scoring', () => {
  it('winner of the trick draws first, loser draws second (taking the face-up trump card on the 17th trick), and winner leads next', () => {
    // Simulate the 17th trick where 2 cards remain in stock (last card is the face-up trumpCard)
    const trump = cardById('DENARI_1');
    const topOfStock = cardById('BASTONI_4');
    const s: RoundState = {
      game: 'briscola',
      deck: [topOfStock, trump],
      table: [],
      dealer: 0,
      turn: 0,
      lastCapturer: null,
      over: false,
      trumpCard: trump,
      trumpSuit: 'DENARI',
      players: [
        { hand: C('COPPE_10', 'SPADE_2', 'BASTONI_2'), captured: [], scope: 0, scopaCards: [] },
        { hand: C('COPPE_3', 'SPADE_4', 'BASTONI_5'), captured: [], scope: 0, scopaCards: [] },
      ],
    };

    // Player 0 leads COPPE_10 (Re = 4 pts)
    const step1 = applyMove(s, { cardId: 'COPPE_10', capture: [] });
    expect(step1.state.table.map((c) => c.id)).toEqual(['COPPE_10']);
    expect(step1.state.turn).toBe(1);
    expect(step1.result.trickWinner).toBeNull();

    // Player 1 follows with COPPE_3 (3 = 10 pts) -> beats COPPE_10!
    const step2 = applyMove(step1.state, { cardId: 'COPPE_3', capture: [] });
    expect(step2.result.trickWinner).toBe(1);
    expect(step2.result.trickPoints).toBe(14);
    expect(step2.result.dealt).toBe(true);
    expect(step2.state.table).toHaveLength(0);
    // Player 1 won the trick -> leads next
    expect(step2.state.turn).toBe(1);
    // Player 1 drew topOfStock (BASTONI_4), Player 0 (loser) drew the face-up trump (DENARI_1)
    expect(step2.state.players[1].hand.map((c) => c.id)).toContain('BASTONI_4');
    expect(step2.state.players[0].hand.map((c) => c.id)).toContain('DENARI_1');
    // Stock is now empty, while trumpSuit and the known trumpCard remain recorded on the round
    expect(step2.state.deck).toHaveLength(0);
    expect(step2.state.trumpCard?.id).toBe('DENARI_1');
    expect(step2.state.trumpSuit).toBe('DENARI');
  });

  it('scores 61+ as 1 hand point and 60-60 as a 0-0 draw requiring a tiebreaker round', () => {
    // Construct a 60-60 round
    // 60 points: 4 Aces (44) + 1 Three (10) + 1 King (4) + 1 Jack (2) = 60
    const p0Cards = C('DENARI_1', 'COPPE_1', 'SPADE_1', 'BASTONI_1', 'DENARI_3', 'DENARI_10', 'DENARI_8');
    const p0Set = new Set(p0Cards.map((c) => c.id));
    const p1Cards = FULL_DECK.filter((c) => !p0Set.has(c.id));
    expect(sumBriscolaPoints(p0Cards)).toBe(60);
    expect(sumBriscolaPoints(p1Cards)).toBe(60);

    const p0: PlayerRound = { hand: [], captured: p0Cards, scope: 0, scopaCards: [] };
    const p1: PlayerRound = { hand: [], captured: p1Cards, scope: 0, scopaCards: [] };

    const tieBd = scoreBriscolaRound([p0, p1], [0, 0], 1, 'DENARI');
    expect([tieBd.player1.pointsEarnedThisRound, tieBd.player2.pointsEarnedThisRound]).toEqual([0, 0]);
    expect(tieBd.player1.briscolaPoints).toBe(60);
    expect(tieBd.player2.briscolaPoints).toBe(60);

    // Move 1 Jack (2 pts) from p0 to p1 -> 58 vs 62
    const winBd = scoreBriscolaRound(
      [
        { hand: [], captured: p0Cards.filter((c) => c.id !== 'DENARI_8'), scope: 0, scopaCards: [] },
        { hand: [], captured: [...p1Cards, cardById('DENARI_8')], scope: 0, scopaCards: [] },
      ],
      [0, 0],
      1,
      'DENARI',
    );
    expect([winBd.player1.pointsEarnedThisRound, winBd.player2.pointsEarnedThisRound]).toEqual([0, 1]);
    expect(winBd.player1.briscolaPoints).toBe(58);
    expect(winBd.player2.briscolaPoints).toBe(62);
  });

  it('plays a Best-of-3 Briscola match to completion', () => {
    const rng = mulberry32(99);
    let m = newMatch(2, rng, 0, 'briscola');
    expect(m.game).toBe('briscola');
    let safety = 0;
    while (m.status !== 'MATCH_OVER' && safety++ < 500) {
      if (m.status === 'ROUND_END') {
        m = nextRound(m, rng);
        continue;
      }
      const seat = m.round.turn;
      const move = legalMoves(m.round.players[seat].hand, m.round.table, 'briscola')[0];
      m = playMove(m, move).match;
    }
    expect(m.status).toBe('MATCH_OVER');
    expect(Math.max(m.scores[0], m.scores[1])).toBe(2);
    expect(m.winner).toBe(m.scores[0] >= 2 ? 0 : 1);
  });
});

describe('Briscola AI', () => {
  it('every difficulty produces legal Briscola moves', () => {
    for (const diff of DIFFICULTIES) {
      const rng = mulberry32(2025);
      let s = dealRound(0, rng, 'briscola');
      let step = 0;
      while (!s.over) {
        const seat = s.turn;
        const obs = observe(s, seat);
        expect(obs.game).toBe('briscola');
        const move = chooseMove(obs, diff, 2025 + step++, 15);
        expect(isLegalMove(s.players[seat].hand, s.table, move, 'briscola')).toBe(true);
        s = applyMove(s, move).state;
      }
      const totalPts = sumBriscolaPoints(s.players[0].captured) + sumBriscolaPoints(s.players[1].captured);
      expect(totalPts).toBe(120);
    }
  });

  it('HARD beats EASY over a series of Briscola rounds', () => {
    let hardPoints = 0;
    let easyPoints = 0;
    for (let i = 1; i <= 16; i++) {
      const rng = mulberry32(1000 + i);
      const dealer = (i % 2) as Seat;
      const hardSeat = (i % 2) as Seat;
      let s = dealRound(dealer, rng, 'briscola');
      let step = 0;
      while (!s.over) {
        const seat = s.turn;
        const diff = seat === hardSeat ? 'HARD' : 'EASY';
        const move = chooseMove(observe(s, seat), diff, i * 100 + step++, 20);
        s = applyMove(s, move).state;
      }
      hardPoints += sumBriscolaPoints(s.players[hardSeat].captured);
      easyPoints += sumBriscolaPoints(s.players[1 - hardSeat].captured);
    }
    expect(hardPoints).toBeGreaterThan(easyPoints);
  }, 60_000);
});

describe('Briscola Multiplayer Room', () => {
  it('runs a full Briscola match in Room with trumpCard/trumpSuit views', () => {
    const clock: Clock = {
      now: () => 1000,
      setTimeout: () => 1,
      clearTimeout: () => {},
    };
    const inbox: [ServerMsg[], ServerMsg[]] = [[], []];
    const room = new Room(
      'BRI123',
      { game: 'briscola', target: 1, turnSeconds: 0, inspector: true },
      'Marco',
      (s, m) => inbox[s].push(m),
      clock,
      77,
    );
    room.join(room.hostToken, 'Marco');
    room.connect(0);
    room.join(undefined, 'Giulia');
    room.connect(1);

    const view = (s: Seat): GameView => {
      const st = inbox[s].filter((m) => m.t === 'state').at(-1);
      return (st as { view: GameView }).view;
    };

    expect(view(0).game).toBe('briscola');
    expect(view(0).trumpCard).not.toBeNull();
    expect(view(0).trumpSuit).not.toBeNull();

    let guard = 0;
    while (view(0).status !== 'MATCH_OVER' && guard++ < 500) {
      const v0 = view(0);
      if (v0.status === 'ROUND_END') {
        room.continueRound(0);
        room.continueRound(1);
        continue;
      }
      const v = view(v0.turn);
      expect(room.play(v0.turn, { cardId: v.hand[0], capture: [] })).toBeNull();
    }
    expect(view(0).status).toBe('MATCH_OVER');
    expect(view(0).breakdown).not.toBeNull();
    expect((view(0).breakdown!.player1.briscolaPoints ?? 0) + (view(0).breakdown!.player2.briscolaPoints ?? 0)).toBe(120);
  });
});
