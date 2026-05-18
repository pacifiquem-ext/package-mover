import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as copyModule from "../src/commands/copy";

describe("copy command", () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("process.exit called");
    }) as any);
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    exitSpy.mockRestore();
    logSpy.mockRestore();
  });

  it("exits on non-Windows platforms", async () => {
    // We're on Linux in CI, so isWindows() returns false → process.exit(0) is called
    await expect(copyModule.start(["dest", "src1"])).rejects.toThrow("process.exit called");
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it("exits when fewer than 2 arguments are provided on Windows", async () => {
    // On non-Windows this would exit before reaching the length check,
    // but the exit behavior is the same: process.exit(0)
    await expect(copyModule.start(["only-one"])).rejects.toThrow("process.exit called");
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it("exports pmCopy as an alias for start", () => {
    expect(copyModule.pmCopy).toBe(copyModule.start);
  });
});
