import { useEffect, useState } from "react";
import {
  loadSignalingUrl,
  loadTurnTokenUrl,
  resetIceServers,
  saveSignalingUrl,
  saveTurnTokenUrl,
} from "../sync/iceConfig";
import { appConfig } from "../../shared/config";

type Props = {
  open: boolean;
  onClose: () => void;
  roomId: string;
  onRoomChange: (next: string) => void;
  myName: string;
  onMyNameChange: (next: string) => void;
};

export function SettingsDrawer({
  open,
  onClose,
  roomId,
  onRoomChange,
  myName,
  onMyNameChange,
}: Props) {
  const [signaling, setSignaling] = useState(loadSignalingUrl());
  const [tokenUrl, setTokenUrl] = useState(loadTurnTokenUrl());
  const [newName, setNewName] = useState("");
  const [roster, setRoster] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setSignaling(loadSignalingUrl());
      setTokenUrl(loadTurnTokenUrl());
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ roster: string[] }>).detail;
      setRoster(detail.roster);
    };
    window.addEventListener("applause:roster-update", handler as EventListener);
    // Ask the wall to publish the current roster (it will dispatch the event back).
    window.dispatchEvent(new CustomEvent("applause:roster-request"));
    return () => window.removeEventListener("applause:roster-update", handler as EventListener);
  }, [open]);

  if (!open) return null;

  const addName = () => {
    const n = newName.trim();
    if (!n) return;
    window.dispatchEvent(new CustomEvent("applause:add-name", { detail: { name: n } }));
    setNewName("");
  };
  const removeName = (n: string) => {
    window.dispatchEvent(new CustomEvent("applause:remove-name", { detail: { name: n } }));
  };
  const clearWall = () => {
    if (!confirm("Clear every note on the wall and return to compose?")) return;
    window.dispatchEvent(new CustomEvent("applause:clear"));
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-drawer" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>Settings</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <label>
          <span>Room ID</span>
          <input value={roomId} onChange={(e) => onRoomChange(e.target.value)} />
        </label>

        <label>
          <span>My name (used when signing)</span>
          <input
            value={myName}
            placeholder="Leave blank to stay anonymous"
            onChange={(e) => onMyNameChange(e.target.value)}
          />
        </label>

        <hr />

        <h3>Team roster</h3>
        <p className="settings-help">
          Names shared across all phones in this room. Anyone in the room can add or remove.
        </p>
        <ul className="applause-roster-list">
          {roster.length === 0 && <li className="applause-roster-empty">Nobody added yet.</li>}
          {roster.map((n) => (
            <li key={n}>
              <span>{n}</span>
              <button type="button" onClick={() => removeName(n)}>
                ×
              </button>
            </li>
          ))}
        </ul>
        <div className="applause-roster-add">
          <input
            value={newName}
            placeholder="Add teammate"
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addName();
              }
            }}
          />
          <button type="button" onClick={addName}>
            Add
          </button>
        </div>

        <div className="settings-actions">
          <button type="button" onClick={clearWall}>
            Clear wall
          </button>
        </div>

        <hr />

        <h3>Self-hosted infra (advanced)</h3>
        <p className="settings-help">
          Override the default signaling and TURN endpoints. Leave blank to use the built-in
          defaults (<code>{appConfig.signalingUrl}</code> and <code>{appConfig.turnTokenUrl}</code>
          ).
        </p>

        <label>
          <span>Signaling URL</span>
          <input
            value={signaling}
            onChange={(e) => setSignaling(e.target.value)}
            placeholder={appConfig.signalingUrl}
          />
        </label>

        <label>
          <span>TURN credentials URL</span>
          <input
            value={tokenUrl}
            onChange={(e) => setTokenUrl(e.target.value)}
            placeholder={appConfig.turnTokenUrl}
          />
        </label>

        <div className="settings-actions">
          <button
            type="button"
            onClick={() => {
              saveSignalingUrl(signaling);
              saveTurnTokenUrl(tokenUrl);
              onClose();
              location.reload();
            }}
          >
            Save and reload
          </button>
          <button
            type="button"
            onClick={() => {
              saveSignalingUrl("");
              saveTurnTokenUrl("");
              resetIceServers();
              onClose();
              location.reload();
            }}
          >
            Reset to defaults
          </button>
        </div>

        <hr />

        <footer className="settings-footer">
          <a href={appConfig.repositoryUrl} target="_blank" rel="noreferrer">
            source on github
          </a>
          <span>
            v{appConfig.version} · {appConfig.commit}
          </span>
        </footer>
      </div>
    </div>
  );
}
