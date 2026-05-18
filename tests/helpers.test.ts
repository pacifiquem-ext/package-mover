import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isWindows, redText, greenText, yellowText, execProm } from "../src/utils";
import {
  ANSI_RED,
  ANSI_GREEN,
  ANSI_YELLOW,
  ANSI_RESET,
} from "../src/constants";

describe("isWindows", () => {
  it("returns false on linux", () => {
    // In the test environment, we are on linux
    expect(isWindows()).toBe(false);
  });

  it("detects win32 platform via match", () => {
    const originalPlatform = Object.getOwnPropertyDescriptor(
      process,
      "platform"
    );
    Object.defineProperty(process, "platform", { value: "win32" });
    expect(isWindows()).toBe(true);
    Object.defineProperty(process, "platform", originalPlatform!);
  });

  it("returns false for darwin", () => {
    const originalPlatform = Object.getOwnPropertyDescriptor(
      process,
      "platform"
    );
    Object.defineProperty(process, "platform", { value: "darwin" });
    expect(isWindows()).toBe(false);
    Object.defineProperty(process, "platform", originalPlatform!);
  });
});

describe("colored text output", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it("redText logs with red ANSI codes", () => {
    redText("error message");
    expect(logSpy).toHaveBeenCalledWith(
      ANSI_RED,
      "error message",
      ANSI_RESET
    );
  });

  it("greenText logs with green ANSI codes", () => {
    greenText("success");
    expect(logSpy).toHaveBeenCalledWith(
      ANSI_GREEN,
      "success",
      ANSI_RESET
    );
  });

  it("yellowText logs with yellow ANSI codes", () => {
    yellowText("warning");
    expect(logSpy).toHaveBeenCalledWith(
      ANSI_YELLOW,
      "warning",
      ANSI_RESET
    );
  });

  it("handles multiple arguments", () => {
    redText("a", "b", "c");
    expect(logSpy).toHaveBeenCalledWith(ANSI_RED, "a", "b", "c", ANSI_RESET);
  });
});

describe("execProm", () => {
  it("resolves with stdout on success", async () => {
    const result = await execProm('echo "hello"');
    expect(result.trim()).toBe("hello");
  });

  it("rejects on command failure", async () => {
    await expect(execProm("command_that_does_not_exist_xyz")).rejects.toBeTruthy();
  });

  it("rejects when stderr is produced", async () => {
    await expect(execProm("echo error >&2")).rejects.toBeTruthy();
  });
});
