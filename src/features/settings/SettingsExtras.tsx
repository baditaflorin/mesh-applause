import { useEffect, useState } from "react";
import { MeshButton } from "@baditaflorin/mesh-common";

type Props = {
  myName: string;
  onMyNameChange: (next: string) => void;
};

export function SettingsExtras({ myName, onMyNameChange }: Props) {
  const [newName, setNewName] = useState("");
  const [roster, setRoster] = useState<string[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ roster: string[] }>).detail;
      setRoster(detail.roster);
    };
    window.addEventListener("applause:roster-update", handler as EventListener);
    window.dispatchEvent(new CustomEvent("applause:roster-request"));
    return () => window.removeEventListener("applause:roster-update", handler as EventListener);
  }, []);

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
    <>
      <label className="applause-settings">
        <span>My name (used when signing)</span>
        <input
          value={myName}
          placeholder="Leave blank to stay anonymous"
          onChange={(e) => onMyNameChange(e.target.value)}
        />
      </label>

      <hr />

      <h3 className="applause-settings-heading">Team roster</h3>
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
        <MeshButton type="button" size="sm" onClick={addName}>
          Add
        </MeshButton>
      </div>

      <div className="settings-actions">
        <MeshButton type="button" variant="danger" onClick={clearWall}>
          Clear wall
        </MeshButton>
      </div>
    </>
  );
}
