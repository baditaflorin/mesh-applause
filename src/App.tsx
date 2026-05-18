import { useEffect, useState } from "react";
import { MeshShell } from "@baditaflorin/mesh-common";
import { ApplauseWall } from "./features/applause/ApplauseWall";
import { SettingsExtras } from "./features/settings/SettingsExtras";
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

  useEffect(() => {
    localStorage.setItem(STORAGE.room, roomId);
  }, [roomId]);
  useEffect(() => {
    localStorage.setItem(STORAGE.name, myName);
  }, [myName]);

  return (
    <MeshShell
      config={appConfig}
      roomId={roomId}
      onRoomChange={setRoomId}
      settingsExtras={<SettingsExtras myName={myName} onMyNameChange={setMyName} />}
    >
      <ApplauseWall roomId={roomId} myName={myName} />
    </MeshShell>
  );
}
