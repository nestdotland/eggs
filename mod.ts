import { Command, HelpCommand, CompletionsCommand } from "./deps.ts";
import { link } from "./src/commands/link.ts";
import { init } from "./src/commands/init.ts";
import { publish } from "./src/commands/publish.ts";
import { update } from "./src/commands/update.ts";
import { install } from "./src/commands/install.ts";
import { upgrade } from "./src/commands/upgrade.ts";

import { version } from "./src/version.ts";

import { setupLog } from "./src/log.ts";

await setupLog();

await new Command()
  .name("eggs")
  .version(version)
  .description(
    "nest.land - A module registry and CDN for Deno, on the permaweb",
  )
  .command("help", new HelpCommand())
  .command("completions", new CompletionsCommand())
  .command("link", link)
  .option("-k, --key <value:string>", "Your API Key") // TODO(@oganexon): move key option to args
  .command("init", init)
  .command("publish", publish)
  .command("update", update)
  .command("install", install)
  .command("upgrade", upgrade)
  .parse(Deno.args);
