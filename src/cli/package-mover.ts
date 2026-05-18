#!/usr/bin/env node
import { program } from "commander";
import { start } from "../commands/mover";
import { ANSI_BOLD, ANSI_RESET } from "../constants";
import type { StartOptions } from "../types";

const bootstrap = async (): Promise<void> => {
  const pkg: { version: string } = require("../../package.json");

  program
    .version(
      `${ANSI_BOLD}v${pkg.version}${ANSI_RESET}`,
      "-v, --version",
      "Output the current version."
    )
    .usage("[options]")
    .helpOption("-h, --help", "Output usage information.")
    .requiredOption(
      "-s, --source <value>",
      "Source folder. Can be absolute or relative path"
    )
    .requiredOption(
      "-d, --destination <value>",
      "Destination folder. Can be absolute or relative path"
    )
    .requiredOption(
      "-p, --packages <value...>",
      "The package(s) that you want to transfer"
    )
    .option("-l, --logErrors", "For logging errors. default `false`");

  program.parse();

  await start({
    ...program.opts(),
    alreadyParsed: true,
  } as StartOptions);
};

bootstrap();
