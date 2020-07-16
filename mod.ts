import { Command, HelpCommand, CompletionsCommand, log } from "./deps.ts";
import { link } from "./src/commands/link.ts";
import { init } from "./src/commands/init.ts";
import { publish } from "./src/commands/publish.ts";
import { update } from "./src/commands/update.ts";
import { install } from "./src/commands/install.ts";
import { upgrade } from "./src/commands/upgrade.ts";

import { version } from "./src/version.ts";

import { setupLog, writeLogFile } from "./src/log.ts";

await setupLog();

try {
  await new Command()
    .throwErrors()
    .name("eggs")
    .version(version)
    .description(
      "nest.land - A module registry and CDN for Deno, on the permaweb",
    )
    .command("help", new HelpCommand())
    .command("completions", new CompletionsCommand())
    .command("link", link)
    .command("init", init)
    .command("publish", publish)
    .command("update", update)
    .command("install", install)
    .command("upgrade", upgrade)
    .parse(Deno.args);
} catch (err) {
  log.critical(err.message, err.stack);
  await writeLogFile();
}
