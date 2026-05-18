import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import { getDependencies, resolveSubDependencies, Params, PackageList } from "../src/utils";

describe("getDependencies", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it("returns an empty PackageList when the package is not in the lock", async () => {
    const params = new Params(["nonexistent"], "/src", "/dest");
    const packageLock = {
      packages: {},
    };
    const result = await getDependencies("nonexistent", params, packageLock, true);
    expect(result.size()).toBe(0);
  });

  it("resolves a package with no sub-dependencies", async () => {
    const params = new Params(["express"], "/src", "/dest");
    const packageLock = {
      packages: {
        "node_modules/express": {
          version: "4.18.0",
        },
      },
    };
    const result = await getDependencies("express", params, packageLock, true);
    expect(result.size()).toBe(1);
    expect(result.names()).toContain("express");
  });

  it("resolves a primary package with its dependencies", async () => {
    const params = new Params(["express"], "/src", "/dest");
    const packageLock = {
      packages: {
        "node_modules/express": {
          version: "4.18.0",
          dependencies: {
            "body-parser": "^1.20.0",
            "cookie": "^0.5.0",
          },
        },
        "node_modules/body-parser": { version: "1.20.0" },
        "node_modules/cookie": { version: "0.5.0" },
      },
    };
    const result = await getDependencies("express", params, packageLock, true);
    expect(result.names()).toContain("express");
    expect(result.names()).toContain("body-parser");
    expect(result.names()).toContain("cookie");
  });

  it("resolves optionalDependencies for primary packages", async () => {
    const params = new Params(["pkg-a"], "/src", "/dest");
    const packageLock = {
      packages: {
        "node_modules/pkg-a": {
          version: "1.0.0",
          optionalDependencies: {
            "opt-dep": "^1.0.0",
          },
        },
        "node_modules/opt-dep": { version: "1.0.0" },
      },
    };
    const result = await getDependencies("pkg-a", params, packageLock, true);
    expect(result.names()).toContain("opt-dep");
  });

  it("uses legacy mode with 'dependencies' key when legacy flag is set", async () => {
    const params = new Params(["express"], "/src", "/dest");
    params.legacy = true;
    const packageLock = {
      dependencies: {
        express: {
          version: "4.18.0",
          dependencies: {
            "body-parser": { version: "1.20.0" },
          },
        },
        "body-parser": { version: "1.20.0" },
      },
    };
    const result = await getDependencies("express", params, packageLock, true);
    expect(result.names()).toContain("express");
  });

  it("falls back to reading package.json when no packageLock is given", async () => {
    const params = new Params(["some-pkg"], "/test-src", "/dest");
    const readFileSpy = vi.spyOn(fs, "readFileSync").mockReturnValue(
      JSON.stringify({
        name: "some-pkg",
        version: "1.0.0",
        dependencies: { "sub-dep": "^1.0.0" },
      })
    );

    // No lock file means empty object = falsy check passes
    const result = await getDependencies("some-pkg", params, null as any, true);
    expect(readFileSpy).toHaveBeenCalled();
    readFileSpy.mockRestore();
  });

  it("logs errors when logErrors is true and resolution fails", async () => {
    const params = new Params(["bad-pkg"], "/nonexistent", "/dest", true);
    const result = await getDependencies("bad-pkg", params, null as any, true);
    expect(logSpy).toHaveBeenCalled();
  });

  it("returns empty list when package info is an empty object", async () => {
    const params = new Params(["empty-pkg"], "/src", "/dest");
    const packageLock = {
      packages: {
        "node_modules/empty-pkg": {},
      },
    };
    // Empty object has length 0, so should return empty
    const result = await getDependencies("empty-pkg", params, packageLock, true);
    // The check is Object.keys(packageInfo).length === 0
    expect(result.size()).toBe(0);
  });
});

describe("resolveSubDependencies", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it("recursively resolves the full dependency tree", async () => {
    const params = new Params(["a"], "/src", "/dest");
    const packageLock = {
      packages: {
        "node_modules/a": {
          version: "1.0.0",
          packages: {
            "b": "^1.0.0",
          },
        },
        "node_modules/b": {
          version: "1.0.0",
          packages: {
            "c": "^1.0.0",
          },
        },
        "node_modules/c": {
          version: "1.0.0",
        },
      },
    };

    const mainPackages = new PackageList();
    mainPackages.add({ name: "a", isPrimary: true, content: packageLock.packages["node_modules/a"] });

    await resolveSubDependencies("a", mainPackages, params, packageLock);

    expect(mainPackages.names()).toContain("a");
    expect(mainPackages.names()).toContain("b");
    expect(mainPackages.names()).toContain("c");
  });

  it("handles circular dependencies without infinite recursion", async () => {
    const params = new Params(["x"], "/src", "/dest");
    const packageLock = {
      packages: {
        "node_modules/x": {
          version: "1.0.0",
          packages: {
            "y": "^1.0.0",
          },
        },
        "node_modules/y": {
          version: "1.0.0",
          packages: {
            "x": "^1.0.0",
          },
        },
      },
    };

    const mainPackages = new PackageList();
    mainPackages.add({ name: "x", isPrimary: true, content: packageLock.packages["node_modules/x"] });

    // This should not infinitely recurse because mainPackages.contains() guards against it
    await resolveSubDependencies("x", mainPackages, params, packageLock);

    expect(mainPackages.contains("x")).toBe(true);
    expect(mainPackages.contains("y")).toBe(true);
  });

  it("does nothing for a package with no sub-dependencies", async () => {
    const params = new Params(["lone"], "/src", "/dest");
    const packageLock = {
      packages: {
        "node_modules/lone": {
          version: "1.0.0",
        },
      },
    };

    const mainPackages = new PackageList();
    mainPackages.add({ name: "lone", isPrimary: true, content: packageLock.packages["node_modules/lone"] });

    await resolveSubDependencies("lone", mainPackages, params, packageLock);
    expect(mainPackages.size()).toBe(1);
  });
});
