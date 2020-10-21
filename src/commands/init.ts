import {
  basename,
  Checkbox,
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
import type { semver } from "../../deps.ts";
import { validateURL, validateVersion } from "../utilities/types.ts";
import { fetchModule } from "../api/fetch.ts";
import type { DefaultOptions } from "../commands.ts";
import { version as eggsVersion } from "../version.ts";
import { setupLog } from "../utilities/log.ts";

/** Init Command.
 * `init` creates (or overrides) configuration in
 * the cwd with an interactive prompt. */
export async function init(options: Options) {
  await setupLog(options.debug);

  let currentConfig: Partial<Config> = {};

  const configPath = await defaultConfig();
  if (configPath) {
    log.warning("An egg config file already exists...");
    const override = await Confirm.prompt("Do you want to override it?");
    if (!override) return;
    currentConfig = await readConfig(configPath);
  }

  const name: string = await Input.prompt({
    message: "Name:",
    default: currentConfig.name || basename(Deno.cwd()),
    minLength: 2,
    maxLength: 40,
  });

  const existing = await fetchModule(name);

  const entry: string | undefined = await Input.prompt({
    message: "Entry file:",
    default: currentConfig.entry,
  }) || undefined;
  const description: string | undefined = await Input.prompt({
    message: "Description:",
    default: currentConfig.description || existing?.description,
  }) || undefined;
  const homepage: string | undefined = await Input.prompt({
    message: "Module homepage:",
    default: currentConfig.homepage || existing?.repository,
    validate: (value) => value === "" || validateURL(value),
  }) || undefined;
  let releaseType: string | undefined = await Select.prompt({
    message: "Semver increment:",
    options: [
      { name: "none", value: "none" },
      Select.separator("--------"),
      { name: "patch", value: "patch" },
      { name: "minor", value: "minor" },
      { name: "major", value: "major" },
      Select.separator("--------"),
      { name: "pre", value: "pre" },
      { name: "prepatch", value: "prepatch" },
      { name: "preminor", value: "preminor" },
      { name: "premajor", value: "premajor" },
      { name: "prerelease", value: "prerelease" },
    ],
    keys: {
      previous: ["up", "8", "u"],
      next: ["down", "2", "d"],
    },
  });
  if (releaseType === "none") releaseType = undefined;

  const version: string | undefined = await Input.prompt({
    message: "Version:",
    default: existing?.getLatestVersion(),
    validate: (value) => value === "" || validateVersion(value),
  }) || undefined;

  const unstable: boolean | undefined = await Confirm.prompt({
    message: "Is this an unstable version?",
    default: currentConfig.unstable ?? false,
  }) || undefined;

  const unlisted: boolean | undefined = await Confirm.prompt({
    message: "Should this module be hidden in the gallery?",
    default: currentConfig.unlisted ?? false,
  }) || undefined;

  let files: string[] | undefined = await List.prompt({
    message: "Files and relative directories to publish, separated by a comma:",
    default: currentConfig.files,
  });
  if (files.length === 1 && files[0] === "") files = undefined;

  let ignore: string[] | undefined = await List.prompt({
    message: "Files and relative directories to ignore, separated by a comma:",
    default: currentConfig.ignore,
  });
  if (ignore.length === 1 && ignore[0] === "") ignore = undefined;

  const check: boolean | undefined = await Confirm.prompt({
    message: "Perform all checks before publication?",
    default: currentConfig.check ?? true,
  });
  const noCheck = !check;

  let checkFormat: boolean | string | undefined =
    noCheck && await Confirm.prompt({
        message: "Check source files formatting before publication?",
        default: (!!currentConfig.checkFormat) ?? false,
      })
      ? await Input.prompt({
        message: "Formatting command (leave blank for default):",
        default: typeof currentConfig.checkFormat === "string"
          ? currentConfig.checkFormat
          : undefined,
      })
      : false;
  if (checkFormat === "") checkFormat = true;

  let checkTests: boolean | string | undefined =
    noCheck && await Confirm.prompt({
        message: "Test your code before publication?",
        default: (!!currentConfig.checkTests) ?? false,
      })
      ? await Input.prompt({
        message: "Testing command (leave blank for default):",
        default: typeof currentConfig.checkTests === "string"
          ? currentConfig.checkTests
          : undefined,
      })
      : false;
  if (checkTests === "") checkTests = true;

  const checkInstallation: boolean | undefined = noCheck &&
    await Confirm.prompt({
      message: "Install module and check for missing files before publication?",
      default: currentConfig.checkInstallation ?? false,
    });

  const format = await Select.prompt({
    message: "Config format: ",
    default: (configPath ? configFormat(configPath) : ConfigFormat.JSON)
      .toUpperCase(),
    options: [
      { name: "YAML", value: ConfigFormat.YAML },
      { name: "JSON", value: ConfigFormat.JSON },
    ],
    keys: {
      previous: ["up", "8", "u"],
      next: ["down", "2", "d"],
    },
  });

  const config: Partial<Config> = {
    "$schema": `https://x.nest.land/eggs@${eggsVersion}/src/schema.json`,
    name,
    entry,
    description,
    homepage,
    version,
    releaseType: releaseType as semver.ReleaseType,
    unstable,
    unlisted,
    files,
    ignore,
    checkFormat,
    checkTests,
    checkInstallation,
    check,
  };

  log.debug("Config: ", config, format);

  await writeConfig(config, format as ConfigFormat);

  log.info("Successfully created config file.");
}

export type Options = DefaultOptions;
export type Arguments = [];

export const initCommand = new Command<Options, Arguments>()
  .version(eggsVersion)
  .description("Initiates a new module for the nest.land registry.")
  .action(init);
