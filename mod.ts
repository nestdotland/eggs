import { Command, HelpCommand, CompletionsCommand, log } from "./deps.ts";
import type { DefaultOptions } from "./src/commands.ts";
import { link } from "./src/commands/link.ts";
import { init } from "./src/commands/init.ts";
import { publish } from "./src/commands/publish.ts";
import { update } from "./src/commands/update.ts";
import { install } from "./src/commands/install.ts";
import { upgrade } from "./src/commands/upgrade.ts";
import { info } from "./src/commands/info.ts";

import { version } from "./src/version/version.ts";

import {
  handleError,
  writeLogFile,
  setupLog,
  errorOccurred,
} from "./src/log.ts";

const commands = { link, init, publish, update, install, upgrade, info };

await setupLog();

const eggs = new Command<DefaultOptions, []>()
  .throwErrors()
  .name("eggs")
  .version(version)
  .description(
    "nest.land - A module registry and CDN for Deno, on the permaweb",
  )
  .option("-d, --debug", "Print additional information.", { global: true })
  .option(
    "-o, --output-log",
    "Create a log file after command completion.",
    { global: true },
  )
  .action(() => {
    eggs.help();
  })
  .command("help", new HelpCommand())
  .command("completions", new CompletionsCommand())
  .command("link", link)
  .command("init", init)
  .command("publish", publish)
  .command("update", update)
  .command("install", install)
  .command("info", info)
  .command("upgrade", upgrade);

try {
  const { options } = await eggs.parse(Deno.args);

  if (options.outputLog) {
    await writeLogFile();
  }
  if (errorOccurred) {
    Deno.exit(1);
  }

  Deno.exit();
} catch (err) {
  if (
    err.message.match(
      /^(Unknown option:|Unknown command:|Option --|Missing value for option:|Missing argument\(s\):)/,
    )
  ) {
    const command = Deno.args[0] as keyof typeof commands;
    if (command in commands) {
      commands[command].help();
    } else {
      eggs.help();
    }
    log.error(err.message);
  } else {
    await handleError(err);
  }
  Deno.exit(1);
}
