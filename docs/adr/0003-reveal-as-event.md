---
status: accepted
date: 2026-05-12
---

# 0003 — Reveal as one event

## Context

A kudos wall can deliver in two shapes:

1. **Trickle.** Notes appear as they're sent, like a Slack channel. Live feed.
2. **Reveal at once.** Notes are hidden during compose; the wall fills up in a single moment when the host taps "Reveal."

These produce very different cultural experiences. Trickle is functional but flat — there's no shared moment, no "wait for it" tension. Reveal-at-once is the standup ritual: everyone composes during the week, on Friday morning the wall lights up, the team reads it together.

## Decision

Notes are written into the shared `Y.Array<Note>("notes")` with `revealed: false` from the start. The compose UI **hides un-revealed notes** entirely — they exist in the CRDT but no UI element renders them. A separate `Y.Map<string, WallState>("state")` singleton tracks the room's `phase: "compose" | "revealed"`.

When the host taps "Reveal wall":

1. In one `Y.Doc.transact`, flip every note's `revealed` field to `true` and set `state.phase = "revealed"`.
2. The UI watches the state map; when it sees `"revealed"`, it switches to the wall view and animates the cards in with a stagger.

The phase is round-scoped: tapping "New round" returns to `"compose"`, leaving the revealed notes visible until "Clear wall" hard-deletes them.

## Consequences

- **Pros.** Preserves the standup ritual. The wait builds anticipation. The animated reveal is the experience, not a side effect.
- **Cons.** Senders can't see the wall until reveal — they can't verify their own note went through. We show "X notes pending" so they know the system received it.
- **Race.** A note submitted during the reveal transaction (rare) could end up with `revealed: false` after the flip completes; the next reveal catches it. Acceptable.

## Alternatives considered

- **Trickle mode.** Rejected for the reason above — kills the moment.
- **Encrypted notes that decrypt on reveal.** Considered for the threat model where peers can read the CRDT before reveal. Rejected as overkill; the privacy model (ADR-docs) accepts that peers in the room can read pre-reveal notes if they sniff the CRDT — social trust handles it for a team kudos wall.
- **Scheduled reveal (auto at time X).** Considered. Rejected — the host's tap is more reliable than coordinating clocks across the team, and a manual "Reveal" is the dramatic moment.
