import { Command } from "./deps.ts";
import { link } from "./src/commands/link.ts";
import { init } from "./src/commands/init.ts";
import { publish } from "./src/commands/publish.ts";
import { update } from "./src/commands/update.ts";
import { install } from "./src/commands/install.ts";
import { upgrade } from "./src/commands/upgrade.ts";

import { version } from "./src/version.ts";

await new Command()
  .name("eggs")
  .version(version)
  .description("nest.land - A package registry for Deno, on the permaweb")
  .command("link", link)
  .option("-k, --key <value:string>", "Your API Key")
  .command("init", init)
  .command("publish", publish)
  .command("update", update)
  .command("install", install)
  .command("upgrade", upgrade)
  .parse(Deno.args);
