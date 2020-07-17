import {
  Command,
  Confirm,
  Input,
  List,
  log,
  basename,
} from "../../deps.ts";
import {
  Config,
  ConfigFormat,
  configFormat,
  defaultConfig,
  readConfig,
  writeConfig,
} from "../config.ts";
import { version } from "../version.ts";

/** Init Command.
 * `init` creates (or overrides) configuration in
 * the cwd with an interactive prompt. */
async function initCommand() {
  let currentConfig: Partial<Config> = {};

  let configPath = defaultConfig();
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
  const files: string[] = await List.prompt({
    message:
      "Enter the files and relative directories that nest.land will publish separated by a comma.",
    default: currentConfig.files,
  });

  // BUG(@oganexon): Select.prompt does not work under Windows

  /* const format: string = await Select.prompt({
    message: "Config format: ",
    default: (configPath ? configFormat(configPath) : ConfigFormat.JSON)
      .toUpperCase(),
    options: [
      { name: "YAML", value: ConfigFormat.YAML },
      { name: "JSON", value: ConfigFormat.JSON },
    ],
  }); */

  const format: string = await Input.prompt({
    message:
      "Config format (json / yaml / yml). Note that you can use a .eggignore file instead: ",
    default: (configPath ? configFormat(configPath) : ConfigFormat.JSON)
      .toUpperCase(),
    minLength: 3,
    maxLength: 4,
  });

  const config = {
    name: name,
    description: description,
    stable: stable,
    files: (files.length === 0 ? currentConfig.files : files),
  };

  await writeConfig(config, format as ConfigFormat);
}

export const init = new Command()
  .version(version)
  .description("Initiates a new module for the nest.land registry.")
  .action(initCommand);
