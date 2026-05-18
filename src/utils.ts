import { resolve as resolvePath, join as joinPath } from "path";
import fs from "fs";
import { exec } from "child_process";

import {
  ANSI_RED,
  ANSI_GREEN,
  ANSI_YELLOW,
  ANSI_RESET,
  DEPENDENCY_TYPES,
  PARAM_ARGS_MAP,
  REQUIRED_PARAMS,
  DEFAULT_SOURCE,
  DEFAULT_LOCKFILE_VERSION,
  DEFAULT_VERSION,
} from "./constants";
import type {
  PackageInfo,
  StartOptions,
  PackageLockFormat,
  GenerateLockOptions,
} from "./types";

export class Params {
  source: string = DEFAULT_SOURCE;
  destination: string | null = null;
  logErrors: boolean = false;
  packages: string[] = [];
  legacy?: boolean;
  forceLock?: boolean;

  constructor(
    packages?: string[],
    source?: string,
    destination?: string | null,
    logErrors?: boolean
  ) {
    if (packages !== undefined) this.packages = packages;
    if (source !== undefined) this.source = source;
    if (destination !== undefined) this.destination = destination;
    if (logErrors !== undefined) this.logErrors = logErrors;
  }
}

export class PackageList {
  private list: PackageInfo[] = [];

  constructor(init?: PackageInfo[]) {
    if (init === undefined) return;
    if (!Array.isArray(init))
      throw new Error(
        "PackageList constructor receives array of initial values"
      );
    init.forEach((el) => this.add(el));
  }

  /**
   * @returns an array of all the packages' names
   */
  names(): string[] {
    return this.list.map((el) => el.name);
  }

  /**
   * @returns an array of all package objects stored
   */
  values(): PackageInfo[] {
    return this.list;
  }

  /**
   * @param prefix optional prefix to prepend to each package name
   * @returns an array of objects with prefixed names as keys and content as values
   */
  content(prefix: string = ""): Record<string, any>[] {
    return this.list.map((el) => ({ [prefix + el.name]: el.content ?? {} }));
  }

  /**
   * @returns an array of objects mapping package names to their versions
   */
  versions(): Record<string, string>[] {
    return this.list.map((el) => ({
      [el.name]: (el.content?.version as string) ?? DEFAULT_VERSION,
    }));
  }

  /**
   * Primary packages are the main packages specified when the program is run.
   * @returns an array of the primary packages
   */
  primary(): PackageInfo[] {
    return this.list.filter(({ isPrimary }) => isPrimary);
  }

  /**
   * Like versions() but only for primary packages, with a '^' prefix on versions.
   * @returns an array of primary package name-version mappings
   */
  primary_versions(): Record<string, string>[] {
    return this.list
      .filter(({ isPrimary }) => isPrimary)
      .map((el) => ({
        [el.name]: "^" + ((el.content?.version as string) ?? DEFAULT_VERSION),
      }));
  }

  /**
   * Adds one or more packages to the list, skipping duplicates.
   * @param val a PackageInfo or array of PackageInfo to add
   * @returns the updated list
   */
  add(val: PackageInfo | PackageInfo[]): PackageInfo[] {
    if (!Array.isArray(val)) val = [val];
    const existingNames = this.names();
    val.forEach((el) => {
      if (existingNames.includes(el.name)) return;
      this.list.push(el);
    });
    return this.list;
  }

  /**
   * @param val name of a package
   * @returns true if the package is already in the list
   */
  contains(val: string): boolean {
    return this.list.some((el) => el.name === val);
  }

  /**
   * @returns the current length of the list
   */
  size(): number {
    return this.list.length;
  }
}

/**
 * Parses the parameters if they are not already parsed and returns a Params object.
 */
export function parseParams(args: StartOptions | string[]): Params {
  if (!Array.isArray(args) && args.alreadyParsed) {
    return new Params(
      Array.isArray(args.packages) ? args.packages : [args.packages],
      args.source,
      args.destination,
      args.logErrors
    );
  }

  const p = new Params();
  const rawArgs = args as string[];

  for (const arg of rawArgs) {
    const [key, value] = arg.split("=");
    const paramKey = (PARAM_ARGS_MAP as Record<string, string>)[key];
    if (paramKey) {
      (p as any)[paramKey] = value;
    }
  }

  for (const param of REQUIRED_PARAMS) {
    if (p[param as keyof Params]) continue;
    redText(`[error] missing --${param} parameter`);
    process.exit(1);
  }

  // formatting: packages comes in as a comma-separated string from raw args
  p.packages = (p.packages as unknown as string).split(",");
  return p;
}

/**
 * Checks if the Operating System is Windows.
 */
export function isWindows(): boolean {
  return !!process.platform.match("win32");
}

/**
 * Logs red output.
 */
export function redText(...args: unknown[]): void {
  console.log(ANSI_RED, ...args, ANSI_RESET);
}

/**
 * Logs green output.
 */
export function greenText(...args: unknown[]): void {
  console.log(ANSI_GREEN, ...args, ANSI_RESET);
}

/**
 * Logs yellow output.
 */
export function yellowText(...args: unknown[]): void {
  console.log(ANSI_YELLOW, ...args, ANSI_RESET);
}

/**
 * Finds the direct sub-dependencies of a package from the lock file.
 * If no lock file is provided, tries to read the package.json directly.
 */
export async function getDependencies(
  packageName: string,
  params: Params,
  packageLock: Record<string, any>,
  isPrimary: boolean = false
): Promise<PackageList> {
  const packages = new PackageList();
  const packageKey = params.legacy
    ? packageName
    : `node_modules/${packageName}`;
  const depTypes: readonly string[] = isPrimary
    ? DEPENDENCY_TYPES
    : [params.legacy ? "dependencies" : "packages"];

  try {
    const packageInfo: Record<string, any> = !packageLock
      ? JSON.parse(
          fs.readFileSync(
            `${params.source}${isWindows() ? "\\" : "/"}node_modules/${packageName}/package.json`,
            "utf-8"
          )
        )
      : packageLock[params.legacy ? "dependencies" : "packages"]?.[
          packageKey
        ] ?? {};

    if (Object.keys(packageInfo).length === 0) return packages;

    packages.add([
      {
        name: packageName,
        isPrimary,
        content:
          packageLock[params.legacy ? "dependencies" : "packages"]?.[
            packageKey
          ] ?? {},
      },
    ]);

    for (const dependencyType of depTypes) {
      packages.add([
        ...((packageInfo[dependencyType] &&
          Object.keys(packageInfo[dependencyType]).map((el) => {
            const _el = params.legacy ? el : `node_modules/${el}`;
            return {
              name: el,
              content:
                packageLock[params.legacy ? "dependencies" : "packages"]?.[
                  _el
                ] ?? {},
            };
          })) ??
          []),
      ]);
    }
  } catch (e) {
    if (params.logErrors) redText("[Error] Failed to resolve :", packageName);
    console.log(e);
  }
  if (params.logErrors)
    console.log(`[${packageName}] depends on`, packages.size(), "packages");
  return packages;
}

/**
 * Recursively resolves the full dependency tree and adds missing packages to mainPackages.
 */
export async function resolveSubDependencies(
  packageName: string,
  mainPackages: PackageList,
  params: Params,
  packageLock: Record<string, any>
): Promise<void> {
  const subpackages = await getDependencies(packageName, params, packageLock);
  for (const subpackage of subpackages.values()) {
    if (!mainPackages.contains(subpackage.name)) {
      await resolveSubDependencies(
        subpackage.name,
        mainPackages,
        params,
        packageLock
      );
    }
    mainPackages.add(subpackage);
  }
}

/**
 * Reads and parses the package-lock.json from the given source directory.
 */
export async function getPackageLock(
  src: string,
  params?: Params
): Promise<Record<string, any>> {
  const srcPackageLockFullPath = joinPath(
    resolvePath(src),
    "./package-lock.json"
  );
  try {
    return JSON.parse(fs.readFileSync(srcPackageLockFullPath, "utf-8"));
  } catch (e) {
    if (params?.logErrors) redText("[Error] Failed to read the package-lock");
    return {};
  }
}

/**
 * Runs child_process.exec as a promise, enabling await and .then usage.
 */
export function execProm(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      if (err) reject(err);
      if (stderr) reject(stderr);
      resolve(stdout);
    });
  });
}

/**
 * Updates the destination package.json and lock file with the transferred packages.
 */
export async function updatePackageJson(
  params: Params,
  packages: PackageList
): Promise<void> {
  const source = JSON.parse(
    fs.readFileSync(`${params.source}/package.json`, "utf-8")
  );
  const destination = JSON.parse(
    fs.readFileSync(`${params.destination}/package.json`, "utf-8")
  );

  let updatedDeps: Record<string, Record<string, string>> = {};

  for (const pkg of params.packages) {
    for (const dependencyType of DEPENDENCY_TYPES) {
      const arr = source[dependencyType]?.[pkg];
      updatedDeps = {
        ...updatedDeps,
        [dependencyType]: {
          ...(updatedDeps[dependencyType] ?? {}),
          ...(arr && { [pkg]: arr }),
        },
      };
    }
  }

  for (const dependencyType of DEPENDENCY_TYPES) {
    destination[dependencyType] = {
      ...(destination[dependencyType] ?? {}),
      ...updatedDeps[dependencyType],
    };
  }

  fs.writeFileSync(
    `${params.destination}/package.json`,
    JSON.stringify(destination, null, 4)
  );

  yellowText("Updating package-lock.json ...");
  await updateLock(
    params,
    packages,
    resolvePath(params.destination!, "./package-lock.json")
  );
  greenText("package-lock.json updated!");
}

/**
 * Updates the destination lock file. Generates one if it does not exist.
 */
export async function updateLock(
  params: Params,
  packages: PackageList,
  lockpath: string
): Promise<void> {
  if (!fs.existsSync(lockpath) || params.forceLock)
    await generatelock(params.destination!, {});
  let destinationPackageLock = await getPackageLock(params.destination!);

  destinationPackageLock = {
    ...destinationPackageLock,
    packages: {
      ...destinationPackageLock.packages,
      "": {
        ...(destinationPackageLock.packages?.[""] ?? {}),
        dependencies: {
          ...(destinationPackageLock.packages?.[""]?.dependencies ?? {}),
          ...packages
            .primary_versions()
            .reduce((prev, cur) => ({ ...prev, ...cur }), {}),
        },
      },
      ...packages
        .content("node_modules/")
        .reduce((prev, cur) => ({ ...prev, ...cur }), {}),
    },
    dependencies: {
      ...destinationPackageLock.dependencies,
      ...packages
        .content()
        .reduce((prev, cur) => ({ ...prev, ...cur }), {}),
    },
  };

  fs.writeFileSync(lockpath, JSON.stringify(destinationPackageLock, null, 4));
}

/**
 * Generates a lock file (package-lock.json or yarn.lock) for a given directory.
 */
export async function generatelock(
  dirPath: string,
  { isNPM = true, force = false }: GenerateLockOptions
): Promise<void> {
  const fullFolderPath = resolvePath(dirPath);
  const sep = isWindows() ? "\\" : "/";
  const lockFileName = isNPM ? "package-lock.json" : "yarn.lock";
  const fullPath = joinPath(resolvePath(dirPath), `.${sep}${lockFileName}`);
  const fullPackageJsonPath = joinPath(
    resolvePath(dirPath),
    `.${sep}package.json`
  );

  let cmd: string;
  const cmd2 = `echo "{}" >> ${fullPath}`;

  if (isWindows()) {
    cmd = `if not exist "${fullFolderPath}" mkdir ${fullFolderPath}`;
  } else {
    cmd = `mkdir -p ${fullFolderPath}`;
  }

  try {
    await execProm(cmd);
    if (fs.existsSync(fullPath) && !force) return;
    if (!fs.existsSync(fullPath)) await execProm(cmd2);

    let packageLock: PackageLockFormat = JSON.parse(
      fs.readFileSync(fullPath, "utf-8")
    );
    const packageJson = JSON.parse(
      fs.readFileSync(fullPackageJsonPath, "utf-8")
    );

    packageLock = {
      name: packageJson.name,
      version: packageJson.version,
      lockfileVersion: DEFAULT_LOCKFILE_VERSION,
      requires: true,
      packages: {
        "": {
          name: packageJson.name,
          version: packageJson.version,
          license: packageJson.license,
          dependencies: {},
        },
      },
      dependencies: {},
    };

    fs.writeFileSync(fullPath, JSON.stringify(packageLock, null, 4));
  } catch (e) {
    console.log(e);
  }
}
