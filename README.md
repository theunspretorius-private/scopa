# Scopa Mobile

A mobile-first build of the classic Italian card game *Scopa*. It follows `scopa_mobile_game_specification.md`: the full rules engine, three AI levels, link-based multiplayer with a server that owns the game state, six regional deck skins, five languages, and a portrait UI built for one-handed play.

It ships as **one TypeScript codebase**:

| Target | How |
| --- | --- |
| Mobile web / PWA (instant link-play, works offline vs. the computer) | `npm run build` and serve with `npm start` |
| iOS / Android native apps | Capacitor wraps the same build (`npm run cap:sync`, then `npx cap add ios` / `android`) |
| Multiplayer backend | Node + WebSocket server in `server/`, which also serves the PWA and the deep-link files |

## Quick start

```bash
npm install
npm run dev        # Vite on :5173 and the game server on :8787, with a proxy between them
npm test           # rules, scoring, AI and room tests
npm run build && npm start   # production: http://localhost:8787
```

To try link play on one machine, create a match, then open the invite link in a second browser profile or on a phone on the same network.

## Project layout

```
src/engine/    Pure rules engine shared by the client and server
               cards, dealing (re-deals a table with 3+ Kings), capture rules
               (single-card priority, sum combinations, must-capture), scopa,
               last-capture sweep, scoring (carte/denari/settebello/primiera/scope),
               match flow (target 11/16/21, play continues until someone leads)
src/ai/        Easy (70/30 random), Medium (weighted captures, defensive trailing,
               tracks sevens), Hard (determinized Monte Carlo search with UCB1
               mid-game; exact minimax with alpha-beta once the stock is empty).
               Runs in a Web Worker.
src/net/       Wire protocol + per-seat views (the opponent's hand and the stock are never sent)
src/client/    UI: screens, procedural SVG deck skins, i18n (en/it/es/fr/pt),
               WebAudio sound + mandolin music loop, haptics, share sheet, deep links
server/        Room server: server-side shuffling and move validation, turn timer
               (15s/30s/none) with auto-play and forfeit after 3 timeouts,
               60s reconnect grace with pause, round-continue and rematch votes
tests/         Vitest suites
```

## Features vs. spec

- **Rules (§2):** all implemented and unit-tested, including the multi-sum choice and the rule that a sweep on the round's last play is not a scopa.
- **Play vs. PC (§3.1):** fully offline. The Master AI counts every card and plays the last 6 cards of each round perfectly.
- **Play with a friend (§3.2):** *Create Invite Link* gives a short `/m/XXXXXX` URL, a native share sheet and a QR code. The server owns the game, and tokens let a player rejoin the same seat after a reload or network switch.
- **Decks (§4):** Napoletane (with the masks), Piacentine, Milanesi (French suits), Siciliane (ochre coins), plus Bergamasche (unlocked by 3 wins) and Trevisane (unlocked by beating the Master; mottoes on the Aces). Card number badges are on by default, and the Settebello shimmers.
- **UX (§5):** portrait lock, tap-to-play and drag-and-drop, multi-sum highlighting (tap one card and the matching set is completed), a scopa banner with haptic and broom sound, an animated round scoreboard, and a pile inspector (on in casual rooms and vs. Easy/Medium, off vs. Master).
- **Emotes (§7):** Italian quick-chat with a mute setting.

## Native apps and deep links

1. Set `VITE_SERVER_URL` (API/WebSocket origin) and `VITE_PUBLIC_URL` (link domain) when building for native.
2. `npm run cap:sync && npx cap add ios && npx cap add android`.
3. The server serves `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json`. Set `APPLE_TEAM_ID` and `ANDROID_SHA256` (comma-separated) in its environment, and add the associated-domains / intent-filter entries for `/m/*` in Xcode and Android Studio. The app routes `appUrlOpen` events into the right room.

Without the app installed, the same link opens the browser version, so a friend can play immediately.

## Server configuration

| Env | Default | |
| --- | --- | --- |
| `PORT` | `8787` | HTTP + WebSocket port |
| `APPLE_TEAM_ID` | – | Universal Links |
| `ANDROID_SHA256` | – | App Links |

Rooms are kept in memory and are cleaned up after 30 minutes with no players connected. Scaling beyond one process would need sticky sessions or shared room storage.
