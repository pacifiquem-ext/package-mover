import { describe, it, expect } from "vitest";
import { PackageList } from "../src/utils";
import type { PackageInfo } from "../src/types";

describe("PackageList", () => {
  const makePkg = (
    name: string,
    isPrimary = false,
    version = "1.0.0"
  ): PackageInfo => ({
    name,
    isPrimary,
    content: { version },
  });

  describe("constructor", () => {
    it("creates an empty list when called with no arguments", () => {
      const list = new PackageList();
      expect(list.size()).toBe(0);
      expect(list.names()).toEqual([]);
    });

    it("creates a list from an initial array", () => {
      const init = [makePkg("a"), makePkg("b")];
      const list = new PackageList(init);
      expect(list.size()).toBe(2);
      expect(list.names()).toEqual(["a", "b"]);
    });

    it("deduplicates during construction", () => {
      const init = [makePkg("a"), makePkg("a"), makePkg("b")];
      const list = new PackageList(init);
      expect(list.size()).toBe(2);
    });

    it("throws when given a non-array argument", () => {
      expect(() => new PackageList("bad" as any)).toThrow(
        "PackageList constructor receives array of initial values"
      );
    });
  });

  describe("add", () => {
    it("adds a single package", () => {
      const list = new PackageList();
      list.add(makePkg("a"));
      expect(list.size()).toBe(1);
      expect(list.names()).toEqual(["a"]);
    });

    it("adds an array of packages", () => {
      const list = new PackageList();
      list.add([makePkg("a"), makePkg("b")]);
      expect(list.size()).toBe(2);
    });

    it("skips duplicates", () => {
      const list = new PackageList();
      list.add(makePkg("a"));
      list.add(makePkg("a"));
      expect(list.size()).toBe(1);
    });

    it("returns the internal list after adding", () => {
      const list = new PackageList();
      const result = list.add(makePkg("a"));
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("a");
    });
  });

  describe("names", () => {
    it("returns all package names in insertion order", () => {
      const list = new PackageList([makePkg("c"), makePkg("a"), makePkg("b")]);
      expect(list.names()).toEqual(["c", "a", "b"]);
    });
  });

  describe("values", () => {
    it("returns all PackageInfo objects", () => {
      const pkgs = [makePkg("a"), makePkg("b")];
      const list = new PackageList(pkgs);
      const vals = list.values();
      expect(vals).toHaveLength(2);
      expect(vals[0].name).toBe("a");
      expect(vals[1].name).toBe("b");
    });
  });

  describe("contains", () => {
    it("returns true for an existing package", () => {
      const list = new PackageList([makePkg("a")]);
      expect(list.contains("a")).toBe(true);
    });

    it("returns false for a missing package", () => {
      const list = new PackageList([makePkg("a")]);
      expect(list.contains("b")).toBe(false);
    });
  });

  describe("size", () => {
    it("returns 0 for empty list", () => {
      expect(new PackageList().size()).toBe(0);
    });

    it("returns correct count after adds", () => {
      const list = new PackageList();
      list.add(makePkg("a"));
      list.add(makePkg("b"));
      list.add(makePkg("c"));
      expect(list.size()).toBe(3);
    });
  });

  describe("content", () => {
    it("returns objects with name keys and content values", () => {
      const list = new PackageList([
        { name: "a", content: { version: "1.0.0" } },
      ]);
      expect(list.content()).toEqual([{ a: { version: "1.0.0" } }]);
    });

    it("applies prefix to names", () => {
      const list = new PackageList([
        { name: "a", content: { version: "1.0.0" } },
      ]);
      expect(list.content("node_modules/")).toEqual([
        { "node_modules/a": { version: "1.0.0" } },
      ]);
    });

    it("defaults content to empty object when undefined", () => {
      const list = new PackageList();
      list.add({ name: "a", content: undefined as any });
      expect(list.content()).toEqual([{ a: {} }]);
    });
  });

  describe("versions", () => {
    it("returns name-version mappings", () => {
      const list = new PackageList([makePkg("a", false, "2.0.0")]);
      expect(list.versions()).toEqual([{ a: "2.0.0" }]);
    });

    it("defaults to 1.0.0 when version is missing", () => {
      const list = new PackageList();
      list.add({ name: "a", content: {} });
      expect(list.versions()).toEqual([{ a: "1.0.0" }]);
    });
  });

  describe("primary", () => {
    it("returns only primary packages", () => {
      const list = new PackageList([
        makePkg("a", true),
        makePkg("b", false),
        makePkg("c", true),
      ]);
      const primaries = list.primary();
      expect(primaries).toHaveLength(2);
      expect(primaries.map((p) => p.name)).toEqual(["a", "c"]);
    });

    it("returns empty array when no primaries exist", () => {
      const list = new PackageList([makePkg("a", false)]);
      expect(list.primary()).toEqual([]);
    });
  });

  describe("primary_versions", () => {
    it("returns caret-prefixed versions for primary packages only", () => {
      const list = new PackageList([
        makePkg("a", true, "3.0.0"),
        makePkg("b", false, "2.0.0"),
      ]);
      expect(list.primary_versions()).toEqual([{ a: "^3.0.0" }]);
    });

    it("defaults to ^1.0.0 when version is missing", () => {
      const list = new PackageList();
      list.add({ name: "a", isPrimary: true, content: {} });
      expect(list.primary_versions()).toEqual([{ a: "^1.0.0" }]);
    });
  });
});
