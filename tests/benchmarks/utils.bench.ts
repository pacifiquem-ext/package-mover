import { describe, bench, beforeEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import {
  PackageList,
  Params,
  parseParams,
  isWindows,
  redText,
  greenText,
  yellowText,
  getDependencies,
  resolveSubDependencies,
  getPackageLock,
  execProm,
  updatePackageJson,
  updateLock,
  generatelock,
} from "../../src/utils";
import type { PackageInfo, StartOptions } from "../../src/types";

// ─── PackageList benchmarks ────────────────────────────────────────────────

describe("PackageList.add", () => {
  bench("add 100 unique packages", () => {
    const list = new PackageList();
    for (let i = 0; i < 100; i++) {
      list.add({ name: `pkg-${i}`, content: { version: "1.0.0" } });
    }
  });

  bench("add 1000 unique packages", () => {
    const list = new PackageList();
    for (let i = 0; i < 1000; i++) {
      list.add({ name: `pkg-${i}`, content: { version: "1.0.0" } });
    }
  });

  bench("add with 50% duplicates (200 adds, 100 unique)", () => {
    const list = new PackageList();
    for (let i = 0; i < 200; i++) {
      list.add({ name: `pkg-${i % 100}`, content: { version: "1.0.0" } });
    }
  });

  bench("add array of 100 packages at once", () => {
    const list = new PackageList();
    const batch: PackageInfo[] = [];
    for (let i = 0; i < 100; i++) {
      batch.push({ name: `pkg-${i}`, content: { version: "1.0.0" } });
    }
    list.add(batch);
  });
});

describe("PackageList.contains", () => {
  let list: PackageList;

  beforeEach(() => {
    list = new PackageList();
    for (let i = 0; i < 500; i++) {
      list.add({ name: `pkg-${i}`, content: { version: "1.0.0" } });
    }
  });

  bench("lookup existing package (first)", () => {
    list.contains("pkg-0");
  });

  bench("lookup existing package (middle)", () => {
    list.contains("pkg-250");
  });

  bench("lookup existing package (last)", () => {
    list.contains("pkg-499");
  });

  bench("lookup non-existing package", () => {
    list.contains("nonexistent");
  });
});

describe("PackageList.names", () => {
  let list: PackageList;

  beforeEach(() => {
    list = new PackageList();
    for (let i = 0; i < 500; i++) {
      list.add({ name: `pkg-${i}`, content: { version: "1.0.0" } });
    }
  });

  bench("names() on 500-element list", () => {
    list.names();
  });
});

describe("PackageList.content", () => {
  let list: PackageList;

  beforeEach(() => {
    list = new PackageList();
    for (let i = 0; i < 500; i++) {
      list.add({ name: `pkg-${i}`, content: { version: `${i}.0.0` } });
    }
  });

  bench("content() with no prefix", () => {
    list.content();
  });

  bench("content() with prefix", () => {
    list.content("node_modules/");
  });
});

describe("PackageList.versions", () => {
  let list: PackageList;

  beforeEach(() => {
    list = new PackageList();
    for (let i = 0; i < 500; i++) {
      list.add({ name: `pkg-${i}`, isPrimary: i < 10, content: { version: `${i}.0.0` } });
    }
  });

  bench("versions() on 500-element list", () => {
    list.versions();
  });

  bench("primary_versions() (10 primaries out of 500)", () => {
    list.primary_versions();
  });
});

describe("PackageList constructor", () => {
  bench("construct from array of 500 packages", () => {
    const init: PackageInfo[] = [];
    for (let i = 0; i < 500; i++) {
      init.push({ name: `pkg-${i}`, content: { version: "1.0.0" } });
    }
    new PackageList(init);
  });
});

// ─── Params & parseParams benchmarks ───────────────────────────────────────

describe("parseParams", () => {
  bench("parse pre-parsed StartOptions", () => {
    parseParams({
      source: "/src",
      destination: "/dest",
      packages: ["a", "b", "c"],
      logErrors: false,
      alreadyParsed: true,
    });
  });

  bench("parse raw string arguments", () => {
    parseParams([
      "--source=/src",
      "--destination=/dest",
      "--packages=a,b,c,d,e",
    ]);
  });
});

describe("Params constructor", () => {
  bench("create with all arguments", () => {
    new Params(["a", "b", "c"], "/src", "/dest", true);
  });

  bench("create with defaults", () => {
    new Params();
  });
});

// ─── isWindows benchmark ───────────────────────────────────────────────────

describe("isWindows", () => {
  bench("platform check", () => {
    isWindows();
  });
});

// ─── Text output benchmarks ────────────────────────────────────────────────

describe("colored text functions", () => {
  const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

  bench("redText", () => {
    redText("error");
  });

  bench("greenText", () => {
    greenText("success");
  });

  bench("yellowText", () => {
    yellowText("warning");
  });
});

// ─── getDependencies benchmark ─────────────────────────────────────────────

describe("getDependencies", () => {
  const buildLockFile = (count: number): Record<string, any> => {
    const packages: Record<string, any> = {};
    for (let i = 0; i < count; i++) {
      packages[`node_modules/dep-${i}`] = {
        version: "1.0.0",
        dependencies: i < count - 1 ? { [`dep-${i + 1}`]: "^1.0.0" } : {},
      };
    }
    return { packages };
  };

  bench("resolve package with 10 dependencies", async () => {
    const lock = buildLockFile(10);
    const params = new Params(["dep-0"], "/src", "/dest");
    await getDependencies("dep-0", params, lock, true);
  });

  bench("resolve package with 50 dependencies", async () => {
    const lock = buildLockFile(50);
    const params = new Params(["dep-0"], "/src", "/dest");
    await getDependencies("dep-0", params, lock, true);
  });

  bench("resolve package with 200 dependencies", async () => {
    const lock = buildLockFile(200);
    const params = new Params(["dep-0"], "/src", "/dest");
    await getDependencies("dep-0", params, lock, true);
  });
});

// ─── resolveSubDependencies benchmark ──────────────────────────────────────

describe("resolveSubDependencies", () => {
  const buildChainLock = (depth: number): Record<string, any> => {
    const packages: Record<string, any> = {};
    for (let i = 0; i < depth; i++) {
      packages[`node_modules/chain-${i}`] = {
        version: "1.0.0",
        packages: i < depth - 1 ? { [`chain-${i + 1}`]: "^1.0.0" } : {},
      };
    }
    return { packages };
  };

  bench("resolve chain of depth 10", async () => {
    const lock = buildChainLock(10);
    const params = new Params(["chain-0"], "/src", "/dest");
    const main = new PackageList();
    main.add({ name: "chain-0", isPrimary: true, content: lock.packages["node_modules/chain-0"] });
    await resolveSubDependencies("chain-0", main, params, lock);
  });

  bench("resolve chain of depth 50", async () => {
    const lock = buildChainLock(50);
    const params = new Params(["chain-0"], "/src", "/dest");
    const main = new PackageList();
    main.add({ name: "chain-0", isPrimary: true, content: lock.packages["node_modules/chain-0"] });
    await resolveSubDependencies("chain-0", main, params, lock);
  });

  bench("resolve chain of depth 100", async () => {
    const lock = buildChainLock(100);
    const params = new Params(["chain-0"], "/src", "/dest");
    const main = new PackageList();
    main.add({ name: "chain-0", isPrimary: true, content: lock.packages["node_modules/chain-0"] });
    await resolveSubDependencies("chain-0", main, params, lock);
  });
});

// ─── IO-bound benchmarks (capped iterations to prevent memory exhaustion) ──

describe("getPackageLock", () => {
  const tmpDir = "/tmp/pm-bench-lock-" + Date.now();

  beforeEach(async () => {
    await fs.promises.mkdir(tmpDir, { recursive: true });
    await fs.promises.writeFile(
      path.join(tmpDir, "package-lock.json"),
      JSON.stringify({ name: "proj", version: "1.0.0", lockfileVersion: 2, packages: { "": {} }, dependencies: {} })
    );
  });

  bench("read and parse lock file", async () => {
    await getPackageLock(tmpDir);
  }, { iterations: 200, time: 2000 });

  bench("graceful fallback on missing file", async () => {
    await getPackageLock("/nonexistent/path");
  }, { iterations: 200, time: 2000 });
});

describe("execProm", () => {
  bench("execute echo command", async () => {
    await execProm("echo ok");
  }, { iterations: 50, time: 2000 });
});

describe("generatelock", () => {
  const tmpDir = "/tmp/pm-bench-genlock-" + Date.now();

  beforeEach(async () => {
    await fs.promises.mkdir(tmpDir, { recursive: true });
    await fs.promises.writeFile(
      path.join(tmpDir, "package.json"),
      JSON.stringify({ name: "bench-proj", version: "1.0.0" })
    );
    try { await fs.promises.unlink(path.join(tmpDir, "package-lock.json")); } catch {}
  });

  bench("generate new lock file (force)", async () => {
    try { await fs.promises.unlink(path.join(tmpDir, "package-lock.json")); } catch {}
    await generatelock(tmpDir, { isNPM: true, force: true });
  }, { iterations: 30, time: 2000 });

  bench("skip existing lock (force=false)", async () => {
    await fs.promises.writeFile(path.join(tmpDir, "package-lock.json"), "{}");
    await generatelock(tmpDir, { isNPM: true, force: false });
  }, { iterations: 100, time: 2000 });
});

describe("updateLock", () => {
  const tmpDir = "/tmp/pm-bench-uplock-" + Date.now();

  beforeEach(async () => {
    await fs.promises.mkdir(tmpDir, { recursive: true });
    await fs.promises.writeFile(
      path.join(tmpDir, "package.json"),
      JSON.stringify({ name: "bench-proj", version: "1.0.0" })
    );
    await fs.promises.writeFile(
      path.join(tmpDir, "package-lock.json"),
      JSON.stringify({
        name: "bench-proj", version: "1.0.0", lockfileVersion: 2,
        packages: { "": { dependencies: {} } }, dependencies: {},
      })
    );
  });

  bench("merge 10 packages into lock", async () => {
    const params = new Params(["pkg-0"], "/src", tmpDir);
    const packages = new PackageList();
    for (let i = 0; i < 10; i++) {
      packages.add({ name: `pkg-${i}`, isPrimary: i === 0, content: { version: "1.0.0" } });
    }
    await updateLock(params, packages, path.join(tmpDir, "package-lock.json"));
  }, { iterations: 100, time: 2000 });

  bench("merge 100 packages into lock", async () => {
    const params = new Params(["pkg-0"], "/src", tmpDir);
    const packages = new PackageList();
    for (let i = 0; i < 100; i++) {
      packages.add({ name: `pkg-${i}`, isPrimary: i === 0, content: { version: "1.0.0" } });
    }
    await updateLock(params, packages, path.join(tmpDir, "package-lock.json"));
  }, { iterations: 50, time: 2000 });
});

describe("updatePackageJson", () => {
  const srcDir = "/tmp/pm-bench-src-" + Date.now();
  const destDir = "/tmp/pm-bench-dest-" + Date.now();

  beforeEach(async () => {
    await fs.promises.mkdir(srcDir, { recursive: true });
    await fs.promises.mkdir(destDir, { recursive: true });
    const deps: Record<string, string> = {};
    for (let i = 0; i < 20; i++) deps[`pkg-${i}`] = `^${i}.0.0`;
    await fs.promises.writeFile(path.join(srcDir, "package.json"), JSON.stringify({ name: "src", version: "1.0.0", dependencies: deps }));
    await fs.promises.writeFile(path.join(destDir, "package.json"), JSON.stringify({ name: "dest", version: "1.0.0", dependencies: {} }));
    await fs.promises.writeFile(
      path.join(destDir, "package-lock.json"),
      JSON.stringify({ name: "dest", version: "1.0.0", lockfileVersion: 2, packages: { "": { dependencies: {} } }, dependencies: {} })
    );
  });

  bench("update with 5 packages", async () => {
    const params = new Params(["pkg-0", "pkg-1", "pkg-2", "pkg-3", "pkg-4"], srcDir, destDir);
    const packages = new PackageList();
    for (let i = 0; i < 5; i++) {
      packages.add({ name: `pkg-${i}`, isPrimary: true, content: { version: `${i}.0.0` } });
    }
    await updatePackageJson(params, packages);
  }, { iterations: 30, time: 2000 });
});
