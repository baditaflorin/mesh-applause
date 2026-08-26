import { expect, test } from "@playwright/test";

const viewports = [
  { name: "phone", width: 390, height: 844 },
  { name: "short desktop", width: 1141, height: 602 },
] as const;

for (const viewport of viewports) {
  test(`landing composition keeps the first action visible on ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("./", { waitUntil: "domcontentloaded" });

    const shell = page.locator("[data-mesh-app-shell]");
    await expect(shell).toHaveAttribute("data-mesh-visual-profile", "gather");
    await expect(shell).toHaveAttribute("data-mesh-shell-layout", "inset");
    await expect(page.getByRole("heading", { name: "Make the good work visible." })).toBeVisible();

    const primary = page.getByRole("button", { name: "Open the appreciation circle" });
    await expect(primary).toBeVisible();
    const box = await primary.boundingBox();
    expect(box).not.toBeNull();
    expect((box?.y ?? Number.POSITIVE_INFINITY) + (box?.height ?? 0)).toBeLessThanOrEqual(
      viewport.height,
    );

    const viewportFits = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(viewportFits).toBe(true);
  });
}

test("the shared drafting state is honest and accessible after joining", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Open the appreciation circle" }).click();

  await expect(page.getByRole("heading", { name: "Hold a little good." })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Private drafting");
  await expect(page.getByLabel("Circle status")).toContainText("1 person in the circle");
  await expect(page.getByText("Give the circle a few names.")).toBeVisible();
});
