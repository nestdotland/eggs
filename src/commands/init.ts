import {
  basename,
  Command,
  Confirm,
  Input,
  List,
  log,
  Select,
} from "../../deps.ts";
import {
  Config,
  ConfigFormat,
  configFormat,
  defaultConfig,
  readConfig,
  writeConfig,
} from "../context/config.ts";
import { DefaultOptions } from "../commands.ts";
import { version } from "../version.ts";
import { setupLog } from "../log.ts";

/** Init Command.
 * `init` creates (or overrides) configuration in
 * the cwd with an interactive prompt. */
async function initCommand(options: DefaultOptions) {
  await setupLog(options.debug);

  let currentConfig: Partial<Config> = {};

  let configPath = await defaultConfig();
  if (configPath) {
    log.warning("An egg config file already exists...");
    const override = await Confirm.prompt("Do you want to override it?");
    if (!override) Deno.exit(0);
    currentConfig = await readConfig(configPath);
  }

  const name: string = await Input.prompt({
    message: "Module name:",
    default: currentConfig.name || basename(Deno.cwd()),
    minLength: 2,
    maxLength: 40,
  });
  const description: string = await Input.prompt({
    message: "Module description:",
    default: currentConfig.description,
    maxLength: 4294967295,
  });
  const stable: boolean = await Confirm.prompt({
    message: "Is this a stable version?",
    default: currentConfig.stable,
  });
  const files: string[] = await List.prompt(
    "Enter the files and relative directories that nest.land will publish separated by a comma.",
  );
  const format: string = await Select.prompt({
    message: "Config format: ",
    default: (configPath ? configFormat(configPath) : ConfigFormat.JSON)
      .toUpperCase(),
    options: [
      { name: "YAML", value: ConfigFormat.YAML },
      { name: "JSON", value: ConfigFormat.JSON },
    ],
  });

  const config = {
    name: name,
    description: description,
    stable: stable,
    files: (files.length === 0 ? currentConfig.files : files),
  };

  log.debug("Config: ", config);

  await writeConfig(config, format as ConfigFormat);

  log.info("Successfully created config file.", format);
}

export const init = new Command<DefaultOptions, []>()
  .version(version)
  .description("Initiates a new module for the nest.land registry.")
  .action(initCommand);
