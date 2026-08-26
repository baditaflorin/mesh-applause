import { expect, test } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  name: string;
};
const storagePrefix = pkg.name;

/**
 * Generic mesh-presence test — works for any mesh-* app without modification.
 * Opens two pages in the same browser context so y-webrtc's BroadcastChannel
 * fallback syncs them with no signaling server / no network.
 *
 * This product starts transport only after its intentional room-entry gesture.
 * The deeper propagation assertion lives in `feature.spec.ts`; this companion
 * ensures the visible peer count includes the offline two-tab transport too.
 */
test("two peers in the same room can both load", async ({ browser, baseURL }) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    await a.getByRole("button", { name: "Open the appreciation circle" }).click();
    await b.getByRole("button", { name: "Open the appreciation circle" }).click();

    await expect(a.getByRole("heading", { name: "Hold a little good." })).toBeVisible();
    await expect(b.getByRole("heading", { name: "Hold a little good." })).toBeVisible();
    await expect(a.getByLabel("Circle status")).toContainText("2 people in the circle", {
      timeout: 10_000,
    });
    await expect(b.getByLabel("Circle status")).toContainText("2 people in the circle", {
      timeout: 10_000,
    });
  } finally {
    await cleanup();
  }
});
