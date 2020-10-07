import {
  Command,
  CompletionsCommand,
  HelpCommand,
  log,
  NestLand,
  UpdateNotifier,
} from "./deps.ts";
import type { DefaultOptions } from "./src/commands.ts";
import { linkCommand } from "./src/commands/link.ts";
import { initCommand } from "./src/commands/init.ts";
import { publishCommand } from "./src/commands/publish.ts";
import { updateCommand } from "./src/commands/update.ts";
import { installCommand } from "./src/commands/install.ts";
import { upgradeCommand } from "./src/commands/upgrade.ts";
import { infoCommand } from "./src/commands/info.ts";

import { version } from "./src/version.ts";

import {
  errorOccurred,
  handleError,
  setupLog,
  writeLogFile,
} from "./src/utilities/log.ts";

const commands = {
  link: linkCommand,
  init: initCommand,
  publish: publishCommand,
  update: updateCommand,
  install: installCommand,
  upgrade: upgradeCommand,
  info: infoCommand,
};

await setupLog();

const notifier = new UpdateNotifier({
  name: "eggs",
  registry: NestLand,
  currentVersion: version,
});

const checkForUpdates = notifier.checkForUpdates();

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
  .command("link", linkCommand)
  .command("init", initCommand)
  .command("publish", publishCommand)
  .command("update", updateCommand)
  .command("install", installCommand)
  .command("info", infoCommand)
  .command("upgrade", upgradeCommand);

try {
  const { options } = await eggs.parse(Deno.args);

  if (options.outputLog) {
    await writeLogFile();
  }
  await notification();

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

  await notification();
  Deno.exit(1);
}

async function notification() {
  await checkForUpdates;
  notifier.notify("eggs upgrade");
}
