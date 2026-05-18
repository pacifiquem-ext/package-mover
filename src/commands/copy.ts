import path from "path";
import { isWindows, execProm } from "../utils";

/**
 * Copies packages on Windows using the pm-copy.bat batch file.
 * Exits immediately on non-Windows platforms or if less than 2 arguments are provided.
 */
export async function start(options: string[]): Promise<void> {
  if (!isWindows()) process.exit(0);
  if (options.length < 2) process.exit(0);
  const destination = options[0];
  const sources = options.slice(1);

  const cmd = `${path.join(__dirname, "./pm-copy.bat")} ${sources.join(" ")} ${destination}`;
  try {
    await execProm(cmd);
  } catch (e) {
    console.log(e);
  }
}

export { start as pmCopy };
