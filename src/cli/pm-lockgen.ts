#!/usr/bin/env node
import { program } from "commander";
import { generatelock } from "../utils";
import { ANSI_BOLD, ANSI_RESET } from "../constants";

const bootstrap = async (): Promise<void> => {
  const pkg: { version: string } = require("../../package.json");

  program
    .version(
      `${ANSI_BOLD}v${pkg.version}${ANSI_RESET}`,
      "-v, --version",
      "Output the current version."
    )
    .usage("[path] [options...]")
    .helpOption("-h, --help", "Output usage information.")
    .argument("<path>", "destination path")
    .option(
      "--yarn",
      "Flag to generate yarn.lock instead of package-lock.json"
    )
    .option("-f, --force", "Override lock file if it already exists");

  program.parse();

  const opts = program.opts<{ yarn?: boolean; force?: boolean }>();
  generatelock(program.args[0], { isNPM: !opts.yarn, force: opts.force });
};

bootstrap();
