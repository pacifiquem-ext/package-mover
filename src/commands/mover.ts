import path from "path";
import {
  PackageList,
  isWindows,
  redText,
  getDependencies,
  resolveSubDependencies,
  getPackageLock,
  updatePackageJson,
  execProm,
  parseParams,
  Params,
} from "../utils";
import { pmCopy } from "./copy";
import type { StartOptions } from "../types";

let params: Params;

/**
 * Main entry point for the package-mover command.
 * Resolves all dependencies, copies folders, and updates destination package.json/lock files.
 */
export async function start(
  options?: StartOptions | string[]
): Promise<void> {
  console.time("duration:");
  params = parseParams(options ?? process.argv.slice(2));
  const packageLock = await getPackageLock(params.source, params);
  const packages = new PackageList();

  for (const pkg of params.packages) {
    packages.add(
      (await getDependencies(pkg, params, packageLock, true)).values()
    );
  }

  for (const packageName of packages.names()) {
    await resolveSubDependencies(packageName, packages, params, packageLock);
  }

  console.log("Copying", packages.size(), "packages...");

  await copyFolders(packages.names());
  await updatePackageJson(params, packages);
  console.timeEnd("duration:");
}

/**
 * Copies all resolved package folders from source to destination.
 */
async function copyFolders(names: string[]): Promise<void> {
  const sep = isWindows() ? "\\" : "/";
  const packageNames =
    params.packages
      .map((el) => `${params.source}${sep}node_modules/${el}`)
      .join(" ") +
    " " +
    names
      .map((el) => `${params.source}${sep}node_modules/${el}`)
      .join(" ");

  let foldercheckCmd: string;
  let copyCmd = "";

  if (isWindows()) {
    foldercheckCmd = `if not exist "${path.resolve(params.destination!)}${sep}node_modules" mkdir ${path.resolve(params.destination!)}${sep}node_modules`;
  } else {
    foldercheckCmd = `mkdir -p ${params.destination}${sep}node_modules`;
    copyCmd = `rsync --ignore-missing-args -r ${packageNames} ${params.destination}${sep}node_modules`;
  }

  try {
    await execProm(foldercheckCmd);
    if (isWindows()) await pmCopy([params.destination!, packageNames]);
    else await execProm(copyCmd);
  } catch (e: any) {
    redText(
      `[Error] Failed to copy the packages\nActual error: ${e.message}`
    );
    process.exit(1);
  }
}
