import { createMeshConfig } from "@baditaflorin/mesh-common";

/**
 * The durable mesh identifier stays `mesh-applause`; the name and visual
 * direction are deliberately product-facing so a room feels like a ritual,
 * not a generic demo surface.
 */
export const appConfig = createMeshConfig({
  appName: "mesh-applause",
  breadcrumbs: false,
  displayName: "Appreciation Circle",
  visualProfile: "gather",
  shellLayout: "inset",
  description:
    "A peer-to-peer appreciation ritual: write a private note, then reveal the room's thanks together.",
  accentHex: "#e9b66d",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
  signalingUrl:
    (import.meta.env.VITE_WEBRTC_SIGNALING as string | undefined) ?? "wss://turn.0docker.com/ws",
  turnTokenUrl:
    (import.meta.env.VITE_TURN_TOKEN_URL as string | undefined) ??
    "https://turn.0docker.com/credentials",
});
