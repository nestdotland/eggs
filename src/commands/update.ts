import {
  Command,
  getLatestVersion,
  globalModulesConfigPath,
  green,
  log,
  parseURL,
  readGlobalModuleConfig,
  semver,
  versionSubstitute,
  yellow,
  writeGlobalModuleConfig,
} from "../../deps.ts";
import { version } from "../version.ts";
import type { DefaultOptions } from "../commands.ts";
import { setupLog } from "../utilities/log.ts";

/** What the constructed dependency objects should contain */
interface ModuleToUpdate {
  line: string;
  versionURL: string;
  latestRelease: string;
}

const decoder = new TextDecoder("utf-8");

async function updateGlobalModules(
  options: Options,
  requestedModules: string[],
): Promise<void> {
  const configPath = globalModulesConfigPath();
  const config = await readGlobalModuleConfig();

  if (config === undefined) return;

  log.debug("Config: ", config);

  for (const executable in config) {
    const module = config[executable];

    if (
      requestedModules.length && requestedModules.indexOf(executable) === -1
    ) {
      continue;
    }

    // Get latest release
    const latestRelease = await getLatestVersion(
      module.registry,
      module.name,
      module.owner,
    );

    // Basic safety net
    if (!module.version || !semver.valid(module.version)) {
      log.debug("Invalid version", module.name, module.version);
      continue;
    }

    if (!latestRelease || !semver.valid(latestRelease)) {
      log.warning(`Could not find the latest version of ${module.name}.`);
      continue;
    }

    if (semver.eq(module.version, latestRelease)) {
      log.debug(module.name, "is already up to date!");
      continue;
    }

    // Update the dependency
    const indexOfURL = module.arguments.findIndex((arg: string) =>
      arg.match(/https:\/\//)
    );

    const newArgs = module.arguments.slice();
    newArgs[indexOfURL] = newArgs[indexOfURL].replace(
      versionSubstitute,
      latestRelease,
    );

    const options = newArgs.filter((x) => x !== "-f");

    const installation = Deno.run({
      cmd: [
        "deno",
        "install",
        "-f",
        ...options,
      ],
    });

    const status = await installation.status();
    installation.close();

    const stdout = new TextDecoder("utf-8").decode(await installation.output());
    const stderr = new TextDecoder("utf-8").decode(
      await installation.stderrOutput(),
    );

    log.debug("stdout: ", stdout);
    log.debug("stderr: ", stderr);

    if (status.success === false || status.code !== 0) {
      log.error(`Update failed for ${executable}`);
      continue;
    }

    module.version = latestRelease;

    log.info(
      `${executable} (${module.name}) ${yellow(module.version)} -> ${
        green(latestRelease)
      }`,
    );
  }

  await writeGlobalModuleConfig(config);

  log.info("Updated your dependencies!");
}

async function updateLocalModules(
  options: Options,
  requestedModules: string[],
): Promise<void> {
  /** Gather the path to the user's dependency file using the CLI arguments */
  let pathToDepFile = "";
  try {
    pathToDepFile = Deno.realPathSync("./" + options.file);
  } catch {
    // Dependency file doesn't exist
    log.warning(
      "No dependency file was found in your current working directory.",
    );
    return;
  }

  /** Creates an array of strings from each line inside the dependency file.
   * Only extracts lines that contain "https://" to strip out non-import lines. */
  const dependencyFileContents: string[] = decoder
    .decode(Deno.readFileSync(pathToDepFile))
    .split("\n")
    .filter((line) => line.indexOf("https://") > 0);

  if (dependencyFileContents.length === 0) {
    log.warning(
      "Your dependency file does not contain any imported modules.",
    );
    return;
  }

  log.debug("Dependency file contents: ", dependencyFileContents);

  /** For each import line in the users dependency file, collate the data ready to be re-written
   * if it can be updated.
   * Skips the dependency if it is not versioned (no need to try to update it) */
  const dependenciesToUpdate: Array<ModuleToUpdate> = [];
  for (const line of dependencyFileContents) {
    let { name, parsedURL, registry, owner, version } = parseURL(line);

    // TODO(@qu4k): edge case: dependency isn't a module, for example: from
    //  "https://x.nest.land/std@version.ts";, will return -> "version.ts";
    // Issue: "Mandarine.TS" is a module while "version.ts" isn't

    // Now we have the name, ignore dependency if requested dependencies are set and it isn't one requested
    if (
      requestedModules.length && requestedModules.indexOf(name) === -1
    ) {
      log.debug(name, "was not requested.");
      continue;
    }

    // Get latest release
    const latestRelease = await getLatestVersion(registry, name, owner);

    // Basic safety net

    if (!version || !semver.valid(version)) {
      log.debug("Invalid version", name, version);
      continue;
    }

    if (!latestRelease || !semver.valid(latestRelease)) {
      log.warning(
        `Warning: could not find the latest version of ${name}.`,
      );
      continue;
    }

    if (semver.eq(version, latestRelease)) {
      log.debug(name, "is already up to date!");
      continue;
    }

    // Collate the dependency
    dependenciesToUpdate.push({
      line,
      versionURL: parsedURL,
      latestRelease,
    });

    log.info(`${name} ${yellow(version)} → ${green(latestRelease)}`);
  }

  // If no modules are needed to update then exit
  if (dependenciesToUpdate.length === 0) {
    log.info("Your dependencies are already up to date!");
    return;
  }

  // Loop through the users dependency file, replacing the imported version with the latest release for each dep
  let dependencyFile = decoder.decode(Deno.readFileSync(pathToDepFile));
  dependenciesToUpdate.forEach((dependency) => {
    dependencyFile = dependencyFile.replace(
      dependency.line,
      dependency.versionURL.replace("${version}", dependency.latestRelease),
    );
  });

  // Re-write the file
  Deno.writeFileSync(
    pathToDepFile,
    new TextEncoder().encode(dependencyFile),
  );

  log.info("Updated your dependencies!");
}

interface Options extends DefaultOptions {
  file: string;
  global: boolean;
}
type Arguments = [string[]];

export const update = new Command<Options, Arguments>()
  .description("Update your dependencies")
  .version(version)
  .arguments("[deps...:string]")
  .option(
    "--file <file:string>",
    "Set dependency filename",
    { default: "deps.ts" },
  )
  .option("-g, --global", "Update global modules")
  .action(async (options: Options, requestedModules: string[] = []) => {
    await setupLog(options.debug);

    log.debug("Options: ", options);

    if (options.global) {
      await updateGlobalModules(options, requestedModules);
    } else {
      await updateLocalModules(options, requestedModules);
    }
  });
