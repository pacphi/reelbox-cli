#!/usr/bin/env node
import { Command } from "commander";

const REQUIRED_NODE_MAJOR = 24;
const nodeMajor = Number.parseInt(process.versions.node.split(".")[0], 10);
if (nodeMajor < REQUIRED_NODE_MAJOR) {
  console.error(
    `reelbox requires Node >= ${REQUIRED_NODE_MAJOR} (you are running ${process.versions.node}).\n` +
      "Install a current Node LTS, e.g. via fnm, nvm, or your package manager.",
  );
  process.exit(1);
}
import { registerExtract } from "./commands/extract.js";
import { registerEnrich } from "./commands/enrich.js";
import { registerBuild } from "./commands/build.js";
import { registerRun } from "./commands/run.js";
import { registerClassify } from "./commands/classify.js";
import { registerStats } from "./commands/stats.js";

const program = new Command();

program
  .name("reelbox")
  .description(
    "Turn your saved Facebook/Instagram Reels and YouTube Shorts into a structured\n" +
      "Markdown library.\n" +
      "Zero-credential by design: reads official Meta DYI / Google Takeout exports\n" +
      "and public enrichment JSON. Never logs in anywhere.",
  )
  .version("1.2.0")
  .showHelpAfterError("(add --help for usage of any command)")
  .showSuggestionAfterError();

registerExtract(program);
registerEnrich(program);
registerBuild(program);
registerClassify(program);
registerStats(program);
registerRun(program);

program.parseAsync(process.argv).catch((err: Error) => {
  console.error(`error: ${err.message}`);
  process.exit(1);
});
