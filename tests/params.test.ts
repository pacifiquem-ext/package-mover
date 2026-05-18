import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Params, parseParams } from "../src/utils";
import { DEFAULT_SOURCE } from "../src/constants";
import type { StartOptions } from "../src/types";

describe("Params", () => {
  describe("constructor", () => {
    it("creates with default values when called with no arguments", () => {
      const p = new Params();
      expect(p.source).toBe(DEFAULT_SOURCE);
      expect(p.destination).toBeNull();
      expect(p.logErrors).toBe(false);
      expect(p.packages).toEqual([]);
    });

    it("creates with all provided values", () => {
      const p = new Params(["pkg-a", "pkg-b"], "/src", "/dest", true);
      expect(p.source).toBe("/src");
      expect(p.destination).toBe("/dest");
      expect(p.logErrors).toBe(true);
      expect(p.packages).toEqual(["pkg-a", "pkg-b"]);
    });

    it("handles partial arguments", () => {
      const p = new Params(["pkg"]);
      expect(p.packages).toEqual(["pkg"]);
      expect(p.source).toBe(DEFAULT_SOURCE);
    });
  });
});

describe("parseParams", () => {
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

  it("returns Params from pre-parsed StartOptions", () => {
    const opts: StartOptions = {
      source: "/src",
      destination: "/dest",
      packages: ["a", "b"],
      logErrors: true,
      alreadyParsed: true,
    };
    const result = parseParams(opts);
    expect(result).toBeInstanceOf(Params);
    expect(result.source).toBe("/src");
    expect(result.destination).toBe("/dest");
    expect(result.packages).toEqual(["a", "b"]);
    expect(result.logErrors).toBe(true);
  });

  it("converts a string packages value into an array", () => {
    const opts: StartOptions = {
      source: "/src",
      destination: "/dest",
      packages: "single-pkg",
      alreadyParsed: true,
    };
    const result = parseParams(opts);
    expect(result.packages).toEqual(["single-pkg"]);
  });

  it("parses raw string arguments", () => {
    const args = [
      "--source=/src",
      "--destination=/dest",
      "--packages=a,b,c",
    ];
    const result = parseParams(args);
    expect(result.source).toBe("/src");
    expect(result.destination).toBe("/dest");
    expect(result.packages).toEqual(["a", "b", "c"]);
  });

  it("exits when required params are missing", () => {
    const args = ["--source=/src"];
    expect(() => parseParams(args)).toThrow("process.exit called");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("ignores unknown arguments gracefully", () => {
    const args = [
      "--source=/src",
      "--destination=/dest",
      "--packages=a",
      "--unknown=value",
    ];
    const result = parseParams(args);
    expect(result.source).toBe("/src");
    expect(result.packages).toEqual(["a"]);
  });
});
