import { Command, Confirm, Input, List, log, Select } from "../../deps.ts";
import {
  Config,
  ConfigFormat,
  configFormat,
  defaultConfig,
  readConfig,
  writeConfig
} from "../config.ts";
import { version } from "../version.ts";

async function initCommand() {
  let currentConfig: Config = {};

  let configPath = defaultConfig();
  if (configPath) {
    log.warning("An egg config file already exists...");
    const override = await Confirm.prompt("Do you want to override it?");
    if (!override) Deno.exit(0);

    currentConfig = await readConfig(configPath);
  }

  const pName: string = await Input.prompt({
    message: "Package name:",
    default: currentConfig.name,
    minLength: 2,
    maxLength: 40,
  });
  const pDesc: string = await Input.prompt({
    message: "Package description:",
    default: currentConfig.description,
    maxLength: 4294967295,
  });
  const pStable: boolean = await Confirm.prompt({
    message: "Is this a stable version?",
    default: currentConfig.stable
  });
  const pFiles: string[] = await List.prompt(
    "Enter the files and relative directories that nest.land will publish separated by a comma.",
  );
  const pFormat: string = await Select.prompt({
    message: "Config format: ",
    default: !!configPath ? configFormat(configPath) : ConfigFormat.JSON,
    options: [
      {name: "YAML", value: ConfigFormat.YAML},
      {name: "JSON", value: ConfigFormat.JSON}
    ]
  });

  const eggConfig = {
    name: pName,
    description: pDesc,
    stable: pStable,
    files: (pFiles.length === 0 ? currentConfig.files : pFiles),
  };

  await writeConfig(eggConfig, pFormat as ConfigFormat);
}

export const init = new Command()
  .version(version)
  .description("Initiates a new module for the nest.land registry.")
  .action(initCommand);
