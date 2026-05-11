import { useEffect, useMemo, useRef, useState } from "react";
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

export function ApplauseWall({ roomId, myName }: Props) {
  const [armed, setArmed] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [roster, setRoster] = useState<string[]>([]);
  const [phase, setPhase] = useState<WallState["phase"]>("compose");
  const [peerCount, setPeerCount] = useState(0);
  const [to, setTo] = useState("");
  const [text, setText] = useState("");
  const [signed, setSigned] = useState(false);
  const revealRef = useRef<HTMLDivElement>(null);

  const room = useMemo<RoomSync | null>(() => {
    if (!armed) return null;
    return createRoomSync(roomId);
  }, [armed, roomId]);

  useEffect(() => {
    if (!armed) return undefined;
    void maybeFetchTurnCredentials();
    return undefined;
  }, [armed]);

  useEffect(() => {
    return () => {
      room?.provider?.destroy();
    };
  }, [room]);

  useEffect(() => {
    if (!room) return undefined;
    const notesArr = room.doc.getArray<Note>("notes");
    const stateMap = room.doc.getMap<WallState>("state");
    const rosterArr = room.doc.getArray<string>("roster");

    const refreshNotes = () => setNotes(notesArr.toArray().map((n) => ({ ...n })));
    const refreshState = () => {
      const s = stateMap.get("current");
      setPhase(s?.phase ?? "compose");
    };
    const refreshRoster = () => {
      const r = rosterArr.toArray();
      setRoster(r);
      window.dispatchEvent(new CustomEvent("applause:roster-update", { detail: { roster: r } }));
    };

    refreshNotes();
    refreshState();
    refreshRoster();
    notesArr.observeDeep(refreshNotes);
    stateMap.observe(refreshState);
    rosterArr.observe(refreshRoster);

    const onAwareness = () => {
      if (!room.provider) return;
      const states = room.provider.awareness.getStates();
      setPeerCount(states.size > 0 ? states.size - 1 : 0);
    };
    room.provider?.awareness.on("change", onAwareness);
    onAwareness();

    const onClear = () => {
      room.doc.transact(() => {
        if (notesArr.length > 0) notesArr.delete(0, notesArr.length);
        stateMap.set("current", { phase: "compose" });
      });
    };
    const onAddName = (e: Event) => {
      const detail = (e as CustomEvent<{ name: string }>).detail;
      const name = detail.name.trim();
      if (!name) return;
      if (rosterArr.toArray().includes(name)) return;
      rosterArr.push([name]);
    };
    const onRemoveName = (e: Event) => {
      const detail = (e as CustomEvent<{ name: string }>).detail;
      const idx = rosterArr.toArray().indexOf(detail.name);
      if (idx >= 0) rosterArr.delete(idx, 1);
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
      room.provider?.awareness.off("change", onAwareness);
      window.removeEventListener("applause:clear", onClear);
      window.removeEventListener("applause:add-name", onAddName as EventListener);
      window.removeEventListener("applause:remove-name", onRemoveName as EventListener);
      window.removeEventListener("applause:roster-request", onRosterRequest);
    };
  }, [room]);

  // Default the "to" dropdown once the roster loads
  useEffect(() => {
    if (!to && roster.length > 0) {
      const first = roster[0];
      if (first !== undefined) setTo(first);
    }
  }, [roster, to]);

  const pendingCount = useMemo(() => notes.filter((n) => !n.revealed).length, [notes]);
  const revealedNotes = useMemo(() => notes.filter((n) => n.revealed), [notes]);

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
          all.map((n) => ({ ...n, revealed: true })),
        );
      }
      stateMap.set("current", { phase: "revealed" });
    });
    // Trigger animation scroll
    setTimeout(() => {
      revealRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }, 50);
  };

  const newRound = () => {
    if (!room) return;
    const stateMap = room.doc.getMap<WallState>("state");
    stateMap.set("current", { phase: "compose" });
  };

  if (!armed) {
    return (
      <div className="applause-arm">
        <h1>mesh-applause</h1>
        <p>
          Anonymous kudos wall for your team. Compose appreciations privately during the week;
          reveal them all at once at the standup. Free replacement for Bonusly and Awardco.
        </p>
        <button type="button" className="applause-arm-button" onClick={() => setArmed(true)}>
          Join wall
        </button>
        <p className="applause-hint">
          Room <code>{roomId}</code>
          {myName && (
            <>
              {" · "}signed as <code>{myName}</code>
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="applause-stage">
      <div className="applause-hud">
        <span>{peerCount + 1} phones</span>
        <span>·</span>
        <span>{pendingCount} pending</span>
        <span>·</span>
        <span>{revealedNotes.length} revealed</span>
      </div>

      {phase === "compose" && (
        <>
          {roster.length === 0 ? (
            <div className="applause-empty">
              <h2>Add your team first</h2>
              <p>
                Open Settings and add the names of the teammates you want to send appreciations to.
                The roster is shared across all phones in the room.
              </p>
            </div>
          ) : (
            <form
              className="applause-compose"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <label>
                <span>To</span>
                <select value={to} onChange={(e) => setTo(e.target.value)} required>
                  {roster.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Appreciation</span>
                <textarea
                  value={text}
                  maxLength={500}
                  rows={3}
                  placeholder="Thanks for…"
                  onChange={(e) => setText(e.target.value)}
                />
              </label>
              <label className="applause-sign">
                <input
                  type="checkbox"
                  checked={signed}
                  disabled={!myName}
                  onChange={(e) => setSigned(e.target.checked)}
                />
                <span>
                  Sign with my name{" "}
                  {myName ? (
                    <>
                      (<em>{myName}</em>)
                    </>
                  ) : (
                    <em>(set your name in Settings)</em>
                  )}
                </span>
              </label>
              <button type="submit" disabled={!text.trim() || !to}>
                Send
              </button>
              <p className="applause-pending">
                {pendingCount} note{pendingCount === 1 ? "" : "s"} pending. Tap{" "}
                <strong>Reveal wall</strong> when the team is ready.
              </p>
              <button
                type="button"
                className="applause-reveal-btn"
                onClick={reveal}
                disabled={pendingCount === 0}
              >
                Reveal wall ({pendingCount})
              </button>
            </form>
          )}
        </>
      )}

      {phase === "revealed" && (
        <div className="applause-reveal" ref={revealRef}>
          <header>
            <h2>The wall</h2>
            <button type="button" className="applause-new-round" onClick={newRound}>
              New round
            </button>
          </header>
          {revealedNotes.length === 0 && (
            <p className="applause-empty-wall">Nothing on the wall yet.</p>
          )}
          <ul className="applause-cards">
            {revealedNotes
              .slice()
              .sort((a, b) => a.ts - b.ts)
              .map((n, i) => (
                <li key={n.id} className="applause-card" style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="applause-to">to {n.to}</div>
                  <div className="applause-text">{n.text}</div>
                  <div className="applause-from">
                    {n.from ? <>— {n.from}</> : <em>— anonymous</em>}
                  </div>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
