# mesh-applause

[![Live](https://img.shields.io/badge/live-baditaflorin.github.io%2Fmesh--applause-e26ad9?style=flat-square)](https://baditaflorin.github.io/mesh-applause/)
[![Version](https://img.shields.io/github/package-json/v/baditaflorin/mesh-applause?style=flat-square&color=9a8db1)](https://github.com/baditaflorin/mesh-applause/blob/main/package.json)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![No backend](https://img.shields.io/badge/backend-none-14101c?style=flat-square)](docs/adr/0001-deployment-mode.md)

> Peer-to-peer browser mesh kudos wall for teams. Anonymous (or signed) appreciations, composed during the week, revealed all at once at the standup. Free replacement for Bonusly and Awardco.

**Live:** https://baditaflorin.github.io/mesh-applause/

Open the link on every team phone. Add your teammates to the roster (shared across all phones). During the week, compose appreciations privately. Friday morning at standup, the host taps **Reveal wall** and the cards animate in. The team reads them together.

## How it works

- Every phone joins a shared **Yjs document** over **y-webrtc** via my [self-hosted signaling server](https://github.com/baditaflorin/signaling-server).
- Team roster is a shared `Y.Array<string>("roster")` — anyone can add or remove names from the Settings drawer.
- Notes are a `Y.Array<{id, to, text, from?, ts, revealed}>("notes")`. Sending a note pushes onto the array with `revealed: false`; the compose UI hides un-revealed notes.
- Wall state is a `Y.Map<"current", {phase: "compose"|"revealed"}>("state")` singleton. Tapping **Reveal wall** flips every note's `revealed` and sets phase to `"revealed"` in one transaction.
- Signing is opt-in. The "from" field is freeform text from the sender's localStorage — no verification, social trust handles it.

## Privacy threat model

See [docs/privacy.md](docs/privacy.md). **Pre-reveal notes are CRDT-visible** — the wall UI hides them, but a determined peer can read the Yjs document. Acceptable for team kudos; not acceptable for confidential messages.

## Architecture

- **Mode A** — pure GitHub Pages, zero backend at runtime. ([ADR 0001](docs/adr/0001-deployment-mode.md))
- **WebRTC transport** — Yjs + y-webrtc with self-hosted signaling and TURN.
- **No GitHub Actions** — `docs/` is committed directly. Pre-push hooks run prettier, tsc, and a build smoke test.

## Run it locally

```bash
git clone https://github.com/baditaflorin/mesh-applause.git
cd mesh-applause
npm install
npm run dev
```

## Self-hosted infrastructure

| Repo                                                                   | Endpoint                               | Role                        |
| ---------------------------------------------------------------------- | -------------------------------------- | --------------------------- |
| [signaling-server](https://github.com/baditaflorin/signaling-server)   | `wss://turn.0docker.com/ws`            | y-webrtc protocol fan-out   |
| [turn-token-server](https://github.com/baditaflorin/turn-token-server) | `https://turn.0docker.com/credentials` | HMAC TURN creds, 1-hour TTL |
| [coturn-hetzner](https://github.com/baditaflorin/coturn-hetzner)       | `turn:turn.0docker.com:3479`           | TURN relay                  |

Override from the in-app Settings drawer.

## Settings (in-app)

- **Room ID** — phones must share one.
- **My name** — used when you toggle "Sign with my name" on a note. Leave blank to stay anonymous-only.
- **Team roster** — shared list of recipients (add/remove names, replicated to every phone).
- **Clear wall** — hard-deletes every note (moderator action).
- **Signaling URL** / **TURN credentials URL** — override defaults.

## ADRs

- [0001 — Deployment mode (Mode A, pure Pages)](docs/adr/0001-deployment-mode.md)
- [0002 — Anonymous-by-default, signed-by-opt-in](docs/adr/0002-anonymous-by-default.md)
- [0003 — Reveal as one event](docs/adr/0003-reveal-as-event.md)
- [0010 — GitHub Pages publishing strategy](docs/adr/0010-pages-publishing.md)

## License

[MIT](LICENSE) © 2026 Florin Badita
