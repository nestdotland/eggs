import { Command, log } from "../../deps.ts";
import { KEY_FILE, writeAPIKey } from "../keyfile.ts";
import { version } from "../version.ts";

/** Link Command.
 * Provided a key, the `link` commands creates
 * a persistent file on the host os to save
 * the API key to. */
async function linkCommand(options: Options, key: string) {
  await writeAPIKey(key);
  log.info(`Successfully updated ${KEY_FILE} with your key!`);
}

export const link = new Command<Options, Arguments>()
  .version(version)
  .description("Links your nest.land API key to the CLI")
  .arguments("<key:string>")
  .action(linkCommand);

type Options = { debug: boolean };

type Arguments = [string];
