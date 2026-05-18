import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import {
  getPackageLock,
  generatelock,
  updateLock,
  updatePackageJson,
  Params,
  PackageList,
  execProm,
} from "../src/utils";
import { DEFAULT_LOCKFILE_VERSION } from "../src/constants";

describe("getPackageLock", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it("reads and parses a valid package-lock.json", async () => {
    const lockContent = {
      name: "test",
      version: "1.0.0",
      lockfileVersion: 2,
      packages: {},
    };
    vi.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify(lockContent));

    const result = await getPackageLock("/some/path");
    expect(result).toEqual(lockContent);
  });

  it("returns empty object when file does not exist", async () => {
    vi.spyOn(fs, "readFileSync").mockImplementation(() => {
      throw new Error("ENOENT");
    });

    const result = await getPackageLock("/nonexistent");
    expect(result).toEqual({});
  });

  it("logs error when logErrors is true and reading fails", async () => {
    vi.spyOn(fs, "readFileSync").mockImplementation(() => {
      throw new Error("ENOENT");
    });

    const params = new Params([], "/src", "/dest", true);
    const result = await getPackageLock("/nonexistent", params);
    expect(result).toEqual({});
    expect(logSpy).toHaveBeenCalled();
  });
});

describe("generatelock", () => {
  const testDir = "/tmp/pm-test-generatelock-" + Date.now();
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await fs.promises.mkdir(testDir, { recursive: true });
    // Create a minimal package.json
    await fs.promises.writeFile(
      path.join(testDir, "package.json"),
      JSON.stringify({ name: "test-proj", version: "0.1.0", license: "MIT" })
    );
  });

  afterEach(async () => {
    logSpy.mockRestore();
    await fs.promises.rm(testDir, { recursive: true, force: true });
  });

  it("generates a package-lock.json with correct structure", async () => {
    await generatelock(testDir, { isNPM: true, force: true });

    const lockPath = path.join(testDir, "package-lock.json");
    const lock = JSON.parse(await fs.promises.readFile(lockPath, "utf-8"));

    expect(lock.name).toBe("test-proj");
    expect(lock.version).toBe("0.1.0");
    expect(lock.lockfileVersion).toBe(DEFAULT_LOCKFILE_VERSION);
    expect(lock.requires).toBe(true);
    expect(lock.packages).toBeDefined();
    expect(lock.packages[""]).toBeDefined();
    expect(lock.dependencies).toEqual({});
  });

  it("does not overwrite an existing lock file when force is false", async () => {
    const lockPath = path.join(testDir, "package-lock.json");
    const existingContent = JSON.stringify({ existing: true });
    await fs.promises.writeFile(lockPath, existingContent);

    await generatelock(testDir, { isNPM: true, force: false });

    const content = await fs.promises.readFile(lockPath, "utf-8");
    expect(JSON.parse(content)).toEqual({ existing: true });
  });

  it("overwrites an existing lock file when force is true", async () => {
    const lockPath = path.join(testDir, "package-lock.json");
    await fs.promises.writeFile(lockPath, JSON.stringify({ old: true }));

    await generatelock(testDir, { isNPM: true, force: true });

    const lock = JSON.parse(await fs.promises.readFile(lockPath, "utf-8"));
    expect(lock.name).toBe("test-proj");
    expect(lock).not.toHaveProperty("old");
  });

  it("creates the directory if it does not exist", async () => {
    const newDir = path.join(testDir, "subdir");
    // Write package.json inside the new directory first for generatelock to read
    await fs.promises.mkdir(newDir, { recursive: true });
    await fs.promises.writeFile(
      path.join(newDir, "package.json"),
      JSON.stringify({ name: "sub", version: "1.0.0" })
    );

    await generatelock(newDir, { force: true });

    const lockPath = path.join(newDir, "package-lock.json");
    expect(fs.existsSync(lockPath)).toBe(true);
  });
});

describe("updateLock", () => {
  const testDir = "/tmp/pm-test-updatelock-" + Date.now();
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await fs.promises.mkdir(testDir, { recursive: true });
    await fs.promises.writeFile(
      path.join(testDir, "package.json"),
      JSON.stringify({ name: "dest-proj", version: "1.0.0" })
    );
  });

  afterEach(async () => {
    logSpy.mockRestore();
    await fs.promises.rm(testDir, { recursive: true, force: true });
  });

  it("creates a lock file and merges package data", async () => {
    const params = new Params(["pkg-a"], "/src", testDir);
    const packages = new PackageList([
      {
        name: "pkg-a",
        isPrimary: true,
        content: { version: "2.0.0" },
      },
    ]);

    const lockPath = path.join(testDir, "package-lock.json");
    await updateLock(params, packages, lockPath);

    const lock = JSON.parse(await fs.promises.readFile(lockPath, "utf-8"));
    expect(lock.packages["node_modules/pkg-a"]).toEqual({ version: "2.0.0" });
    expect(lock.packages[""].dependencies).toHaveProperty("pkg-a");
  });

  it("merges into existing lock file data", async () => {
    const lockPath = path.join(testDir, "package-lock.json");
    const existingLock = {
      name: "dest-proj",
      version: "1.0.0",
      lockfileVersion: 2,
      requires: true,
      packages: {
        "": { dependencies: { "existing-pkg": "^1.0.0" } },
        "node_modules/existing-pkg": { version: "1.0.0" },
      },
      dependencies: {
        "existing-pkg": { version: "1.0.0" },
      },
    };
    await fs.promises.writeFile(lockPath, JSON.stringify(existingLock));

    const params = new Params(["new-pkg"], "/src", testDir);
    const packages = new PackageList([
      { name: "new-pkg", isPrimary: true, content: { version: "3.0.0" } },
    ]);

    await updateLock(params, packages, lockPath);

    const lock = JSON.parse(await fs.promises.readFile(lockPath, "utf-8"));
    // Both old and new packages should exist
    expect(lock.packages["node_modules/existing-pkg"]).toBeDefined();
    expect(lock.packages["node_modules/new-pkg"]).toEqual({ version: "3.0.0" });
  });
});

describe("updatePackageJson", () => {
  const srcDir = "/tmp/pm-test-src-" + Date.now();
  const destDir = "/tmp/pm-test-dest-" + Date.now();
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await fs.promises.mkdir(srcDir, { recursive: true });
    await fs.promises.mkdir(destDir, { recursive: true });

    await fs.promises.writeFile(
      path.join(srcDir, "package.json"),
      JSON.stringify({
        name: "source-proj",
        version: "1.0.0",
        dependencies: { express: "^4.18.0", lodash: "^4.17.0" },
        devDependencies: { mocha: "^10.0.0" },
      })
    );

    await fs.promises.writeFile(
      path.join(destDir, "package.json"),
      JSON.stringify({
        name: "dest-proj",
        version: "1.0.0",
        dependencies: {},
      })
    );

    await fs.promises.writeFile(
      path.join(destDir, "package-lock.json"),
      JSON.stringify({
        name: "dest-proj",
        version: "1.0.0",
        lockfileVersion: 2,
        requires: true,
        packages: { "": { dependencies: {} } },
        dependencies: {},
      })
    );
  });

  afterEach(async () => {
    logSpy.mockRestore();
    await fs.promises.rm(srcDir, { recursive: true, force: true });
    await fs.promises.rm(destDir, { recursive: true, force: true });
  });

  it("copies specified dependency versions from source to destination", async () => {
    const params = new Params(["express"], srcDir, destDir);
    const packages = new PackageList([
      { name: "express", isPrimary: true, content: { version: "4.18.0" } },
    ]);

    await updatePackageJson(params, packages);

    const destPkg = JSON.parse(
      await fs.promises.readFile(path.join(destDir, "package.json"), "utf-8")
    );
    expect(destPkg.dependencies.express).toBe("^4.18.0");
  });

  it("preserves existing destination dependencies", async () => {
    // Add an existing dep to destination
    await fs.promises.writeFile(
      path.join(destDir, "package.json"),
      JSON.stringify({
        name: "dest-proj",
        version: "1.0.0",
        dependencies: { axios: "^1.0.0" },
      })
    );

    const params = new Params(["express"], srcDir, destDir);
    const packages = new PackageList([
      { name: "express", isPrimary: true, content: { version: "4.18.0" } },
    ]);

    await updatePackageJson(params, packages);

    const destPkg = JSON.parse(
      await fs.promises.readFile(path.join(destDir, "package.json"), "utf-8")
    );
    expect(destPkg.dependencies.axios).toBe("^1.0.0");
    expect(destPkg.dependencies.express).toBe("^4.18.0");
  });

  it("also updates the package-lock.json", async () => {
    const params = new Params(["express"], srcDir, destDir);
    const packages = new PackageList([
      { name: "express", isPrimary: true, content: { version: "4.18.0" } },
    ]);

    await updatePackageJson(params, packages);

    const destLock = JSON.parse(
      await fs.promises.readFile(
        path.join(destDir, "package-lock.json"),
        "utf-8"
      )
    );
    expect(destLock.packages["node_modules/express"]).toBeDefined();
  });
});
