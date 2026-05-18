import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import * as utils from "../src/utils";
import { start } from "../src/commands/mover";
import type { StartOptions } from "../src/types";

describe("mover command - start", () => {
  const srcDir = "/tmp/pm-test-mover-src-" + Date.now();
  const destDir = "/tmp/pm-test-mover-dest-" + Date.now();
  let logSpy: ReturnType<typeof vi.spyOn>;
  let timeSpy: ReturnType<typeof vi.spyOn>;
  let timeEndSpy: ReturnType<typeof vi.spyOn>;
  let execPromSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    timeSpy = vi.spyOn(console, "time").mockImplementation(() => {});
    timeEndSpy = vi.spyOn(console, "timeEnd").mockImplementation(() => {});
    // Mock execProm so rsync/mkdir shell commands succeed in the test env
    execPromSpy = vi.spyOn(utils, "execProm").mockResolvedValue("");

    // Set up source directory with node_modules
    await fs.promises.mkdir(path.join(srcDir, "node_modules", "test-pkg"), { recursive: true });
    await fs.promises.writeFile(
      path.join(srcDir, "package.json"),
      JSON.stringify({
        name: "source",
        version: "1.0.0",
        dependencies: { "test-pkg": "^1.0.0" },
      })
    );
    await fs.promises.writeFile(
      path.join(srcDir, "package-lock.json"),
      JSON.stringify({
        name: "source",
        version: "1.0.0",
        lockfileVersion: 2,
        packages: {
          "": { dependencies: { "test-pkg": "^1.0.0" } },
          "node_modules/test-pkg": { version: "1.0.0" },
        },
        dependencies: {
          "test-pkg": { version: "1.0.0" },
        },
      })
    );
    await fs.promises.writeFile(
      path.join(srcDir, "node_modules", "test-pkg", "package.json"),
      JSON.stringify({ name: "test-pkg", version: "1.0.0" })
    );

    // Set up destination directory
    await fs.promises.mkdir(path.join(destDir, "node_modules"), { recursive: true });
    await fs.promises.writeFile(
      path.join(destDir, "package.json"),
      JSON.stringify({ name: "dest", version: "1.0.0", dependencies: {} })
    );
    await fs.promises.writeFile(
      path.join(destDir, "package-lock.json"),
      JSON.stringify({
        name: "dest",
        version: "1.0.0",
        lockfileVersion: 2,
        packages: { "": { dependencies: {} } },
        dependencies: {},
      })
    );
  });

  afterEach(async () => {
    logSpy.mockRestore();
    timeSpy.mockRestore();
    timeEndSpy.mockRestore();
    execPromSpy.mockRestore();
    await fs.promises.rm(srcDir, { recursive: true, force: true });
    await fs.promises.rm(destDir, { recursive: true, force: true });
  });

  it("moves packages from source to destination", async () => {
    const opts: StartOptions = {
      source: srcDir,
      destination: destDir,
      packages: ["test-pkg"],
      alreadyParsed: true,
    };

    await start(opts);

    // Verify destination package.json was updated
    const destPkg = JSON.parse(
      await fs.promises.readFile(path.join(destDir, "package.json"), "utf-8")
    );
    expect(destPkg.dependencies["test-pkg"]).toBe("^1.0.0");

    // Verify timing was called
    expect(timeSpy).toHaveBeenCalledWith("duration:");
    expect(timeEndSpy).toHaveBeenCalledWith("duration:");
  });

  it("logs the number of packages being copied", async () => {
    const opts: StartOptions = {
      source: srcDir,
      destination: destDir,
      packages: ["test-pkg"],
      alreadyParsed: true,
    };

    await start(opts);

    expect(logSpy).toHaveBeenCalledWith("Copying", expect.any(Number), "packages...");
  });

  it("calls execProm for mkdir and rsync on non-Windows", async () => {
    const opts: StartOptions = {
      source: srcDir,
      destination: destDir,
      packages: ["test-pkg"],
      alreadyParsed: true,
    };

    await start(opts);

    // execProm should have been called for mkdir -p and rsync
    const calls = execPromSpy.mock.calls.map((c) => c[0] as string);
    expect(calls.some((c: string) => c.includes("mkdir"))).toBe(true);
    expect(calls.some((c: string) => c.includes("rsync"))).toBe(true);
  });
});
