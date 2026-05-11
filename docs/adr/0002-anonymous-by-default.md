---
status: accepted
date: 2026-05-12
---

# 0002 — Anonymous-by-default, signed-by-opt-in

## Context

Kudos walls have two competing pressures:

- **Anonymous appreciations are psychologically easier to write.** People don't feel exposed; criticism-anxious teammates send more notes.
- **Signed appreciations are richer.** The recipient can thank back personally; the sender gets visible credit; the team learns who notices what.

Tools that pick one mode (Bonusly is fully signed; Slack "thanks bot" is signed; truly-anonymous form tools strip identity entirely) miss the other audience. We want both, and we want the default to favor frictionless first-time use.

## Decision

Notes have an **optional `from` field** in the shared data model:

```ts
type Note = { id, to, text, from?: string, ts, revealed }
```

The compose UI defaults the "Sign with my name" checkbox to **off**. The user can toggle it on per-note. If they leave it off, `from` is `undefined` and the wall renders "— anonymous". If they toggle on, `from = myName` (a local localStorage value, never validated against any roster).

Notes are not delivered without a recipient (`to` is required and comes from the shared roster). The roster is a `Y.Array<string>("roster")` shared across phones so everyone agrees on the available names — but `from` is freeform text from the sender's localStorage, which is intentional: the sender can sign as whatever they like.

## Consequences

- **Pros.** First-time users send anonymous notes by default — low friction. Returning users who want credit can toggle signing on. Both modes coexist on the same wall, so a team can have a mix.
- **Cons.** Two display modes on the same wall (anonymous + signed). We accept this — the wall is a list of cards, mixed signing is visually fine.
- **No verification.** The "from" field is untrusted text. A user could sign as someone else. This is the same threat as in Slack and Bonusly — social pressure handles it.

## Alternatives considered

- **Always anonymous.** Rejected — kills the "thank back personally" loop and the cultural signal of "I appreciated X."
- **Always signed.** Rejected — anxious senders stop sending. Defeats the purpose.
- **Three-state toggle (anonymous / pseudonym / real name).** Considered. Rejected as overkill; users can just type a pseudonym in their localStorage name if they want one.
