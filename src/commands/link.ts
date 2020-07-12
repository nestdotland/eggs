import { Command, join, log } from "../../deps.ts";
import { homedir } from "../utilities/files.ts";
import { keySuffix } from "../utilities/keyfile.ts";
import { version } from "../version.ts";

export const link = new Command()
  .version(version)
  .description("Links your nest.land API key to the CLI")
  .action(async () => {
    if (Deno.args.length < 3) {
      log.error(
        "You need to pass in your API key! To do this, add `--key <your_key>` to the end of this command.",
      ), Deno.exit(1);
    }
    const keyPath = join(homedir(), `/.nest-api-key${keySuffix}`);

    await Deno.writeFile(keyPath, new TextEncoder().encode(Deno.args[2]));
    log.info(`Successfully updated ~/.nest-api-key${keySuffix} with your key!`);
  });
