import { Command, log } from "../../deps.ts";
import { DefaultOptions } from "../commands.ts";
import { KEY_FILE, writeAPIKey } from "../keyfile.ts";
import { version } from "../version.ts";
import { setupLog } from "../log.ts";

/** Link Command.
 * Provided a key, the `link` commands creates
 * a persistent file on the host os to save
 * the API key to. */
async function linkCommand(options: DefaultOptions, key: string) {
  await setupLog(options.debug);

  log.debug("Key: ", key);
  await writeAPIKey(key);
  log.info(`Successfully updated ${KEY_FILE} with your key!`);
}

type Arguments = [string];

export const link = new Command<DefaultOptions, Arguments>()
  .version(version)
  .description("Links your nest.land API key to the CLI")
  .arguments("<key:string>")
  .action(linkCommand);
