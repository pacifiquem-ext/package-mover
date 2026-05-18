import { describe, it, expect } from "vitest";
import {
  ANSI_RED,
  ANSI_GREEN,
  ANSI_YELLOW,
  ANSI_RESET,
  ANSI_BOLD,
  DEPENDENCY_TYPES,
  PARAM_ARGS_MAP,
  REQUIRED_PARAMS,
  DEFAULT_SOURCE,
  DEFAULT_LOCKFILE_VERSION,
  DEFAULT_VERSION,
} from "../src/constants";

describe("constants", () => {
  describe("ANSI codes", () => {
    it("ANSI_RED is the red escape code", () => {
      expect(ANSI_RED).toBe("\x1b[031m");
    });

    it("ANSI_GREEN is the green escape code", () => {
      expect(ANSI_GREEN).toBe("\x1b[032m");
    });

    it("ANSI_YELLOW is the yellow escape code", () => {
      expect(ANSI_YELLOW).toBe("\x1b[033m");
    });

    it("ANSI_RESET clears formatting", () => {
      expect(ANSI_RESET).toBe("\x1b[0m");
    });

    it("ANSI_BOLD enables bold", () => {
      expect(ANSI_BOLD).toBe("\x1b[1m");
    });
  });

  describe("DEPENDENCY_TYPES", () => {
    it("contains the four standard dependency types", () => {
      expect(DEPENDENCY_TYPES).toContain("dependencies");
      expect(DEPENDENCY_TYPES).toContain("optionalDependencies");
      expect(DEPENDENCY_TYPES).toContain("peerDependencies");
      expect(DEPENDENCY_TYPES).toContain("devDependencies");
      expect(DEPENDENCY_TYPES).toHaveLength(4);
    });

    it("is frozen (immutable at runtime)", () => {
      expect(Object.isFrozen(DEPENDENCY_TYPES)).toBe(true);
    });
  });

  describe("PARAM_ARGS_MAP", () => {
    it("maps CLI flags to Params property names", () => {
      expect(PARAM_ARGS_MAP["--source"]).toBe("source");
      expect(PARAM_ARGS_MAP["--destination"]).toBe("destination");
      expect(PARAM_ARGS_MAP["--logErrors"]).toBe("logErrors");
      expect(PARAM_ARGS_MAP["--packages"]).toBe("packages");
      expect(PARAM_ARGS_MAP["--legacy"]).toBe("legacy");
      expect(PARAM_ARGS_MAP["--forceLock"]).toBe("forceLock");
    });

    it("is frozen (immutable at runtime)", () => {
      expect(Object.isFrozen(PARAM_ARGS_MAP)).toBe(true);
    });
  });

  describe("REQUIRED_PARAMS", () => {
    it("contains source, destination, and packages", () => {
      expect(REQUIRED_PARAMS).toContain("source");
      expect(REQUIRED_PARAMS).toContain("destination");
      expect(REQUIRED_PARAMS).toContain("packages");
      expect(REQUIRED_PARAMS).toHaveLength(3);
    });

    it("is frozen (immutable at runtime)", () => {
      expect(Object.isFrozen(REQUIRED_PARAMS)).toBe(true);
    });
  });

  describe("default values", () => {
    it("DEFAULT_SOURCE is './'", () => {
      expect(DEFAULT_SOURCE).toBe("./");
    });

    it("DEFAULT_LOCKFILE_VERSION is 2", () => {
      expect(DEFAULT_LOCKFILE_VERSION).toBe(2);
    });

    it("DEFAULT_VERSION is '1.0.0'", () => {
      expect(DEFAULT_VERSION).toBe("1.0.0");
    });
  });
});
