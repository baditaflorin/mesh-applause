import { useEffect, useMemo, useRef, useState } from "react";
import {
  MeshButton,
  MeshPresence,
  MeshShellConnectionBridge,
  MeshStatusPill,
  MeshSurface,
  type YRoom,
} from "@baditaflorin/mesh-common";
import { createRoomSync, type RoomSync } from "../sync/yjsRoom";
import { maybeFetchTurnCredentials } from "../sync/iceConfig";

export type Note = {
  id: string;
  to: string;
  text: string;
  from?: string;
  ts: number;
  revealed: boolean;
};

export type WallState = { phase: "compose" | "revealed" };

type Props = {
  roomId: string;
  myName: string;
};

function RoomSignals({
  people,
  pendingCount,
  revealedCount,
  phase,
}: {
  people: number;
  pendingCount: number;
  revealedCount: number;
  phase: WallState["phase"];
}) {
  const isRevealed = phase === "revealed";

  return (
    <div className="applause-signals" aria-label="Circle status">
      <MeshStatusPill tone={isRevealed ? "live" : "info"} dot announce="polite">
        {isRevealed ? "Wall open" : "Private drafting"}
      </MeshStatusPill>
      <MeshPresence
        count={people}
        label={people === 1 ? "person in the circle" : "people in the circle"}
        state="connected"
      />
      <span className="applause-signal-count">
        <strong>{pendingCount}</strong> waiting
      </span>
      {revealedCount > 0 ? (
        <span className="applause-signal-count">
          <strong>{revealedCount}</strong> shared
        </span>
      ) : null}
    </div>
  );
}

/**
 * The application deliberately keeps its room gesture-gated. The bridge
 * reports that same, already-created Yjs room to MeshShell so shell diagnostics
 * and invite metadata describe the actual peer connection rather than a
 * second, fabricated transport.
 */
function toShellRoom(room: RoomSync, roomId: string, peerCount: number): YRoom {
  return {
    doc: room.doc,
    provider: room.provider,
    peerId: room.peerId,
    roomId,
    peerCount,
  };
}

export function ApplauseWall({ roomId, myName }: Props) {
  const [armed, setArmed] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [roster, setRoster] = useState<string[]>([]);
  const [phase, setPhase] = useState<WallState["phase"]>("compose");
  const [peerCount, setPeerCount] = useState(0);
  const [to, setTo] = useState("");
  const [text, setText] = useState("");
  const [signed, setSigned] = useState(false);
  const [savedNotice, setSavedNotice] = useState("");
  const revealRef = useRef<HTMLDivElement>(null);

  const room = useMemo<RoomSync | null>(() => {
    if (!armed) return null;
    return createRoomSync(roomId);
  }, [armed, roomId]);

  const shellRoom = useMemo<YRoom | null>(
    () => (room ? toShellRoom(room, roomId, peerCount) : null),
    [peerCount, room, roomId],
  );

  useEffect(() => {
    if (!armed) return undefined;
    void maybeFetchTurnCredentials();
    return undefined;
  }, [armed]);

  useEffect(() => {
    return () => {
      room?.provider?.destroy();
      room?.doc.destroy();
    };
  }, [room]);

  useEffect(() => {
    if (!room) return undefined;
    const notesArr = room.doc.getArray<Note>("notes");
    const stateMap = room.doc.getMap<WallState>("state");
    const rosterArr = room.doc.getArray<string>("roster");

    const refreshNotes = () => setNotes(notesArr.toArray().map((note) => ({ ...note })));
    const refreshState = () => {
      const next = stateMap.get("current");
      setPhase(next?.phase ?? "compose");
    };
    const refreshRoster = () => {
      const next = rosterArr.toArray();
      setRoster(next);
      window.dispatchEvent(new CustomEvent("applause:roster-update", { detail: { roster: next } }));
    };

    refreshNotes();
    refreshState();
    refreshRoster();
    notesArr.observeDeep(refreshNotes);
    stateMap.observe(refreshState);
    rosterArr.observe(refreshRoster);

    const refreshPeerCount = () => {
      if (!room.provider) return;
      // y-webrtc exposes direct WebRTC and same-browser BroadcastChannel
      // peers separately. The latter is essential for our offline two-tab
      // mode, where awareness alone can otherwise report only this device.
      const transportPeers = new Set([
        ...Array.from(room.provider.room?.webrtcConns.keys() ?? []),
        ...Array.from(room.provider.room?.bcConns ?? []),
      ]);
      if (transportPeers.size > 0) {
        setPeerCount(transportPeers.size);
        return;
      }
      const states = room.provider.awareness.getStates();
      setPeerCount(states.size > 0 ? states.size - 1 : 0);
    };
    const onPeerChange = () => refreshPeerCount();
    room.provider?.awareness.on("change", refreshPeerCount);
    room.provider?.on("peers", onPeerChange);
    refreshPeerCount();

    const onClear = () => {
      room.doc.transact(() => {
        if (notesArr.length > 0) notesArr.delete(0, notesArr.length);
        stateMap.set("current", { phase: "compose" });
      });
      setSavedNotice("");
    };
    const onAddName = (event: Event) => {
      const detail = (event as CustomEvent<{ name: string }>).detail;
      const name = detail.name.trim();
      if (!name || rosterArr.toArray().includes(name)) return;
      rosterArr.push([name]);
    };
    const onRemoveName = (event: Event) => {
      const detail = (event as CustomEvent<{ name: string }>).detail;
      const index = rosterArr.toArray().indexOf(detail.name);
      if (index >= 0) rosterArr.delete(index, 1);
    };
    const onRosterRequest = () => {
      window.dispatchEvent(
        new CustomEvent("applause:roster-update", { detail: { roster: rosterArr.toArray() } }),
      );
    };

    window.addEventListener("applause:clear", onClear);
    window.addEventListener("applause:add-name", onAddName as EventListener);
    window.addEventListener("applause:remove-name", onRemoveName as EventListener);
    window.addEventListener("applause:roster-request", onRosterRequest);

    return () => {
      notesArr.unobserveDeep(refreshNotes);
      stateMap.unobserve(refreshState);
      rosterArr.unobserve(refreshRoster);
      room.provider?.awareness.off("change", refreshPeerCount);
      room.provider?.off("peers", onPeerChange);
      window.removeEventListener("applause:clear", onClear);
      window.removeEventListener("applause:add-name", onAddName as EventListener);
      window.removeEventListener("applause:remove-name", onRemoveName as EventListener);
      window.removeEventListener("applause:roster-request", onRosterRequest);
    };
  }, [room]);

  useEffect(() => {
    if (!to && roster.length > 0) {
      const first = roster[0];
      if (first !== undefined) setTo(first);
    }
  }, [roster, to]);

  const pendingCount = useMemo(() => notes.filter((note) => !note.revealed).length, [notes]);
  const revealedNotes = useMemo(() => notes.filter((note) => note.revealed), [notes]);
  const people = peerCount + 1;

  const submit = () => {
    if (!room) return;
    const trimmed = text.trim();
    const recipient = to.trim();
    if (!recipient || !trimmed) return;
    const notesArr = room.doc.getArray<Note>("notes");
    const note: Note = {
      id: crypto.randomUUID(),
      to: recipient,
      text: trimmed.slice(0, 500),
      from: signed && myName ? myName : undefined,
      ts: Date.now(),
      revealed: false,
    };
    notesArr.push([note]);
    setText("");
    setSavedNotice(`A note for ${recipient} is held for the reveal.`);
  };

  const reveal = () => {
    if (!room) return;
    const notesArr = room.doc.getArray<Note>("notes");
    const stateMap = room.doc.getMap<WallState>("state");
    room.doc.transact(() => {
      const all = notesArr.toArray();
      if (all.length > 0) {
        notesArr.delete(0, all.length);
        notesArr.insert(
          0,
          all.map((note) => ({ ...note, revealed: true })),
        );
      }
      stateMap.set("current", { phase: "revealed" });
    });
    setSavedNotice("");
    window.setTimeout(() => revealRef.current?.scrollTo({ top: 0, behavior: "smooth" }), 50);
  };

  const newRound = () => {
    if (!room) return;
    room.doc.getMap<WallState>("state").set("current", { phase: "compose" });
    setSavedNotice("");
  };

  if (!armed) {
    return (
      <main className="applause-landing" aria-labelledby="applause-landing-title">
        <div className="applause-landing-glow" aria-hidden="true" />
        <section className="applause-landing-copy">
          <p className="applause-eyebrow">A shared end-of-week ritual</p>
          <h1 id="applause-landing-title">Make the good work visible.</h1>
          <p className="applause-landing-lede">
            Write a note while the moment is fresh. Keep it private until the team is together, then
            open the wall in one shared beat.
          </p>
          <div className="applause-landing-actions">
            <MeshButton size="lg" onClick={() => setArmed(true)}>
              Open the appreciation circle
            </MeshButton>
            <span className="applause-room-note">
              This device joins <code>{roomId}</code>
            </span>
          </div>
        </section>

        <MeshSurface as="aside" tone="raised" padding="lg" className="applause-landing-card">
          <div className="applause-orbit" aria-hidden="true">
            <span className="applause-orbit-core">+</span>
            <span className="applause-orbit-dot applause-orbit-dot-one" />
            <span className="applause-orbit-dot applause-orbit-dot-two" />
            <span className="applause-orbit-dot applause-orbit-dot-three" />
          </div>
          <div className="applause-ritual-copy">
            <span>01</span>
            <p>Write something specific.</p>
            <span>02</span>
            <p>Hold it until the room is ready.</p>
            <span>03</span>
            <p>Read it together, with no feed to perform for.</p>
          </div>
        </MeshSurface>
      </main>
    );
  }

  return (
    <main className="applause-stage" aria-labelledby="applause-stage-title">
      {shellRoom ? <MeshShellConnectionBridge room={shellRoom} /> : null}
      <header className="applause-stage-header">
        <div>
          <p className="applause-eyebrow">Appreciation round</p>
          <h1 id="applause-stage-title">
            {phase === "compose" ? "Hold a little good." : "The circle is open."}
          </h1>
          <p className="applause-stage-lede">
            {phase === "compose"
              ? "Notes stay out of sight until someone opens the wall for everyone."
              : "Every note in this round is now visible to every person in the room."}
          </p>
        </div>
        <RoomSignals
          people={people}
          pendingCount={pendingCount}
          revealedCount={revealedNotes.length}
          phase={phase}
        />
      </header>

      <div className="applause-hud" aria-live="polite">
        <span>{people === 1 ? "Just you here" : `${people} people connected`}</span>
        <span aria-hidden="true">·</span>
        <span>{pendingCount} waiting for reveal</span>
        <span aria-hidden="true">·</span>
        <span>{revealedNotes.length} shared</span>
      </div>

      {phase === "compose" ? (
        roster.length === 0 ? (
          <MeshSurface as="section" tone="accent" padding="lg" className="applause-empty">
            <span className="applause-empty-index">01</span>
            <div>
              <h2>Give the circle a few names.</h2>
              <p>
                Open <strong>Settings</strong> and add the people you want to thank. The roster is
                shared with every device in this room.
              </p>
            </div>
          </MeshSurface>
        ) : (
          <div className="applause-workspace">
            <MeshSurface as="section" tone="raised" padding="lg" className="applause-compose-card">
              <div className="applause-card-heading">
                <div>
                  <p className="applause-section-label">Write a note</p>
                  <h2>Be specific. Keep it simple.</h2>
                </div>
                <span className="applause-step-marker">01</span>
              </div>
              <form
                className="applause-compose"
                onSubmit={(event) => {
                  event.preventDefault();
                  submit();
                }}
              >
                <label>
                  <span>For</span>
                  <select value={to} onChange={(event) => setTo(event.target.value)} required>
                    {roster.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>What mattered?</span>
                  <textarea
                    value={text}
                    maxLength={500}
                    rows={4}
                    placeholder="You made the hard part feel possible because…"
                    onChange={(event) => {
                      setText(event.target.value);
                      setSavedNotice("");
                    }}
                  />
                </label>
                <div className="applause-compose-footer">
                  <label className="applause-sign">
                    <input
                      type="checkbox"
                      checked={signed}
                      disabled={!myName}
                      onChange={(event) => setSigned(event.target.checked)}
                    />
                    <span>
                      Sign it {myName ? <em>as {myName}</em> : <em>(add your name in Settings)</em>}
                    </span>
                  </label>
                  <MeshButton type="submit" disabled={!text.trim() || !to}>
                    Hold this note
                  </MeshButton>
                </div>
              </form>
              <p className="applause-private-note">
                The note is shared in the room’s CRDT, but the experience keeps its text hidden
                until reveal.
              </p>
              {savedNotice ? <p className="applause-saved-notice">{savedNotice}</p> : null}
            </MeshSurface>

            <MeshSurface as="aside" tone="accent" padding="lg" className="applause-reveal-card">
              <div className="applause-card-heading">
                <div>
                  <p className="applause-section-label">Bring everyone in</p>
                  <h2>Open the wall when the room is ready.</h2>
                </div>
                <span className="applause-step-marker">02</span>
              </div>
              <div className="applause-reveal-metric">
                <strong>{pendingCount}</strong>
                <span>{pendingCount === 1 ? "note waiting" : "notes waiting"}</span>
              </div>
              <p>
                One action changes the shared phase for everyone. There is no hidden host copy or
                separate audience feed.
              </p>
              <MeshButton
                className="applause-reveal-btn"
                fullWidth
                size="lg"
                onClick={reveal}
                disabled={pendingCount === 0}
              >
                Reveal the wall{pendingCount > 0 ? ` · ${pendingCount}` : ""}
              </MeshButton>
            </MeshSurface>
          </div>
        )
      ) : (
        <section
          className="applause-reveal"
          ref={revealRef}
          aria-label="Revealed appreciation wall"
        >
          <div className="applause-reveal-header">
            <div>
              <p className="applause-section-label">Shared notes</p>
              <h2>The room made this.</h2>
            </div>
            <MeshButton variant="secondary" onClick={newRound}>
              Start a new round
            </MeshButton>
          </div>
          {revealedNotes.length === 0 ? (
            <MeshSurface tone="quiet" padding="lg" className="applause-empty-wall">
              Nothing was held for this round. Start a new one when there is something worth saying.
            </MeshSurface>
          ) : (
            <ul className="applause-cards">
              {revealedNotes
                .slice()
                .sort((a, b) => a.ts - b.ts)
                .map((note, index) => (
                  <li
                    key={note.id}
                    className="applause-card"
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <div className="applause-card-topline">
                      <span className="applause-to">For {note.to}</span>
                      <span className="applause-card-number">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <p className="applause-text">{note.text}</p>
                    <p className="applause-from">{note.from ? `— ${note.from}` : "— anonymous"}</p>
                  </li>
                ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
