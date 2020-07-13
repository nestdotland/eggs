import { Command, log } from "../../deps.ts";
import { KEY_FILE, writeAPIKey } from "../keyfile.ts";
import { version } from "../version.ts";

/**
 * Link Command.
 * Provided a key, the `link` commands creates
 * a persistent file on the host os to save
 * the API key to.
 */
async function linkCommand() {
  if (Deno.args.length < 3) {
    log.critical(
      "You need to pass in your API key! To do this, add `--key <your_key>` to the end of this command.",
    );
    Deno.exit(1);
  }

  await writeAPIKey(Deno.args[2]);
  log.info(`Successfully updated ${KEY_FILE} with your key!`);
}

export const link = new Command()
  .version(version)
  .description("Links your nest.land API key to the CLI")
  .action(linkCommand);
