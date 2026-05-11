# Privacy threat model — mesh-applause

## What other peers in the same room can see

- The shared **team roster** (a `Y.Array<string>` of names).
- Every note in the room, including un-revealed ones (the "revealed" flag controls display, not visibility in the CRDT). Other peers in the room can technically read all pending notes by inspecting the Yjs document.
- The room's `phase: "compose" | "revealed"`.

**Pre-reveal notes are visible to anyone with CRDT access.** The wall UI hides them, but the data is on every phone in the room. For informal team use this is fine — anyone in the room could ask their teammate "what'd you write?" anyway. For stronger threat models (where peers might run custom Yjs introspectors), this is not a secret-ballot system.

The `from` field is an untrusted string from the sender's localStorage — anyone can sign as anyone, and there's no verification.

## What stays local

- Your name (used when signing) — written to `localStorage`, never published unless you toggle "Sign with my name."
- Your room ID and self-hosted infra overrides.

## What the signaling server sees

`signaling-server` (mine, https://github.com/baditaflorin/signaling-server) sees the room name, encrypted SDP relay, and the WebSocket IP. It does not see note text — that flows peer-to-peer over WebRTC DataChannel.

## What the TURN server sees

`coturn-hetzner` (mine, https://github.com/baditaflorin/coturn-hetzner) relays encrypted WebRTC bytes when peers can't connect directly. It sees IP addresses of both endpoints and encrypted DTLS-SRTP traffic. It cannot decrypt notes.

## Permissions asked

None.

## What's NOT in the threat model

- **Pre-reveal secrecy.** Pre-reveal notes are CRDT-visible; the UI hides them but a determined peer can read them. Acceptable for team kudos; not acceptable for confidential messages.
- **Authorship verification.** "Signed by X" is unverified — anyone can claim any name. Social trust handles it.
- **Sybil resistance.** A user could spam the wall from multiple browser instances. The roster's `to` field constrains recipients to the agreed-upon team, but a single sender can send unlimited notes. Acceptable for the use case.
