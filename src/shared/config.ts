export const appConfig = {
  appName: "mesh-applause",
  storagePrefix: "mesh-applause",
  description:
    "Peer-to-peer mesh: anonymous kudos wall. Send appreciations to teammates; reveal at standup. Replaces Bonusly, Awardco.",
  accentHex: "#e561c1",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
  repositoryUrl: "https://github.com/baditaflorin/mesh-applause",
  pagesUrl: "https://baditaflorin.github.io/mesh-applause/",
  signalingUrl:
    (import.meta.env.VITE_WEBRTC_SIGNALING as string | undefined) ?? "wss://turn.0docker.com/ws",
  turnTokenUrl:
    (import.meta.env.VITE_TURN_TOKEN_URL as string | undefined) ??
    "https://turn.0docker.com/credentials",
  paypalUrl: "https://www.paypal.com/paypalme/florinbadita",
} as const;
