import { expect, test } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  name: string;
};
const storagePrefix = pkg.name;

/**
 * Load-bearing cross-peer test for the ADVERTISED core action:
 * "Anonymous (or signed) appreciations, composed during the week, revealed all
 * at once at the standup."
 *
 * Drives the full advertised flow across two peers over the Yjs doc:
 *   1. Peer A adds a teammate to the shared roster → peer B's roster syncs.
 *   2. Peer A composes a private note to that teammate → peer B sees it as
 *      *pending* (count crosses the mesh) but NOT the text (compose hides it).
 *   3. Peer A (host) taps "Reveal wall" → peer B's phase flips to "revealed"
 *      and the note's text appears on peer B's wall.
 *
 * This fails on any code that writes notes/roster/reveal-phase to React state
 * instead of the shared Y.Array/Y.Map, or where peers key off divergent names.
 */
test("roster + private note + reveal propagate peer→peer", async ({ browser, baseURL }) => {
  const roomId = `e2e-${Math.random().toString(36).slice(2, 8)}`;
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", {
    storagePrefix,
    roomId,
  });
  try {
    // Arm both peers (the "Join wall" gate).
    await a.getByRole("button", { name: /join wall/i }).click();
    await b.getByRole("button", { name: /join wall/i }).click();

    // Peer A opens Settings and adds a teammate to the shared roster.
    const teammate = `Robin-${roomId}`;
    const aDrawer = a.locator(".mesh-settings-drawer, .settings-drawer");
    if ((await aDrawer.count()) === 0) {
      await a.getByLabel("Open settings").click();
    }
    await a.getByPlaceholder(/add teammate/i).fill(teammate);
    await a.getByRole("button", { name: /^add$/i }).click();

    // Close the drawer so its overlay stops intercepting clicks on the wall.
    await a.getByRole("button", { name: /^close$/i }).click();

    // Peer B's roster (shared Y.Array) must contain the new teammate. The
    // compose <select> only renders an <option> once the roster syncs.
    await expect(b.locator("select option", { hasText: teammate })).toHaveCount(1, {
      timeout: 10000,
    });

    // Peer A composes a private appreciation to the teammate.
    const note = `Thanks for the heroic on-call ${roomId}`;
    await a.locator(".applause-compose textarea").fill(note);
    await a.getByRole("button", { name: /^send$/i }).click();

    // Peer B sees the note as PENDING (count crosses the mesh) — but the text
    // stays hidden until reveal. Assert the pending count, not the text.
    await expect(b.locator(".applause-hud")).toContainText(/1 pending/, { timeout: 10000 });
    await expect(b.getByText(note)).toHaveCount(0);

    // Peer A (host) reveals the wall.
    await a.getByRole("button", { name: /reveal wall/i }).click();

    // Peer B's phase flips to revealed and the note text appears on its wall —
    // the heart of the advertised "revealed all at once" claim.
    await expect(b.locator(".applause-reveal")).toBeVisible({ timeout: 10000 });
    await expect(b.getByText(note)).toBeVisible({ timeout: 10000 });
  } finally {
    await cleanup();
  }
});
