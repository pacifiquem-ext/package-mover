#!/usr/bin/env node
import { program } from "commander";
import { start } from "../commands/copy";
import { ANSI_BOLD, ANSI_RESET } from "../constants";

const bootstrap = async (): Promise<void> => {
  const pkg: { version: string } = require("../../package.json");

  program
    .version(
      `${ANSI_BOLD}v${pkg.version}${ANSI_RESET}`,
      "-v, --version",
      "Output the current version."
    )
    .usage("[destination] [sources...]")
    .helpOption("-h, --help", "Output usage information.")
    .argument("<destination>", "destination path")
    .argument("<sources...>", "space separated arrays of sources to copy");

  program.parse();

  start(program.args);
};

bootstrap();
