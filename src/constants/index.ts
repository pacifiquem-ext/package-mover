// ANSI escape codes for terminal coloring
export const ANSI_RED = "\x1b[031m";
export const ANSI_GREEN = "\x1b[032m";
export const ANSI_YELLOW = "\x1b[033m";
export const ANSI_RESET = "\x1b[0m";
export const ANSI_BOLD = "\x1b[1m";

// Dependency types to scan in package.json / lock files
export const DEPENDENCY_TYPES = Object.freeze([
  "dependencies",
  "optionalDependencies",
  "peerDependencies",
  "devDependencies",
] as const);

// Mapping of CLI argument flags to Params property names
export const PARAM_ARGS_MAP = Object.freeze({
  "--source": "source",
  "--destination": "destination",
  "--logErrors": "logErrors",
  "--packages": "packages",
  "--legacy": "legacy",
  "--forceLock": "forceLock",
} as const);

// Required parameters that must be provided
export const REQUIRED_PARAMS = Object.freeze([
  "source",
  "destination",
  "packages",
] as const);

// Default values
export const DEFAULT_SOURCE = "./";
export const DEFAULT_LOCKFILE_VERSION = 2;
export const DEFAULT_VERSION = "1.0.0";
