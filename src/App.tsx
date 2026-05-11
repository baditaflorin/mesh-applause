import { useEffect, useState } from "react";
import { ApplauseWall } from "./features/applause/ApplauseWall";
import { SettingsDrawer } from "./features/settings/SettingsDrawer";
import { appConfig } from "./shared/config";

const STORAGE = {
  room: `${appConfig.storagePrefix}:room`,
  name: `${appConfig.storagePrefix}:myName`,
};

function readString(key: string, fallback: string): string {
  return localStorage.getItem(key) ?? fallback;
}

export function App() {
  const [roomId, setRoomId] = useState(() => readString(STORAGE.room, "default"));
  const [myName, setMyName] = useState(() => readString(STORAGE.name, ""));
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE.room, roomId);
  }, [roomId]);
  useEffect(() => {
    localStorage.setItem(STORAGE.name, myName);
  }, [myName]);

  return (
    <div className="app-root">
      <ApplauseWall roomId={roomId} myName={myName} />

      <button
        type="button"
        className="settings-fab"
        onClick={() => setSettingsOpen(true)}
        aria-label="Open settings"
      >
        ⚙
      </button>

      <div className="self-ref">
        <a href={appConfig.repositoryUrl} target="_blank" rel="noreferrer">
          source
        </a>
        <span aria-hidden="true">·</span>
        <a href={appConfig.paypalUrl} target="_blank" rel="noreferrer">
          tip ♥
        </a>
        <span aria-hidden="true">·</span>
        <span>
          v{appConfig.version} · {appConfig.commit}
        </span>
      </div>

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        roomId={roomId}
        onRoomChange={setRoomId}
        myName={myName}
        onMyNameChange={setMyName}
      />
    </div>
  );
}
