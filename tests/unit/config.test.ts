import { describe, expect, it } from "vitest";
import { appConfig } from "../../src/shared/config";

describe("Appreciation Circle product contract", () => {
  it("keeps the durable mesh identifier while exposing a human-facing surface", () => {
    expect(appConfig.appName).toBe("mesh-applause");
    expect(appConfig.storagePrefix).toBe("mesh-applause");
    expect(appConfig.displayName).toBe("Appreciation Circle");
    expect(appConfig.visualProfile).toBe("gather");
    expect(appConfig.shellLayout).toBe("inset");
  });
});
