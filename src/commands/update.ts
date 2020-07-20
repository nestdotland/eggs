import {
  analyzeURL,
  Command,
  getLatestVersion,
  globalModulesConfigPath,
  green,
  semver,
  versionSubstitute,
  yellow,
} from "../../deps.ts";
import {
  readGlobalModuleConfig,
  writeGlobalModuleConfig,
} from "../global_module.ts";

const decoder = new TextDecoder("utf-8");

/** What the constructed dependency objects should contain */
interface ModuleToUpdate {
  line: string;
  versionURL: string;
  latestRelease: string;
}

export const update = new Command<Options, Arguments>()
  .description("Update your dependencies")
  .arguments("[deps...:string]")
  .option(
    "--file <file:string>",
    "Set dependency filename",
    { default: "deps.ts" },
  )
  .option("-g, --global", "Update global modules")
  .action(async (options: Options, requestedModules: string[] = []) => {
    if (options.global) {
      await updateGlobalModules(options, requestedModules);
    } else {
      await updateLocalModules(options, requestedModules);
    }
  });

async function updateGlobalModules(
  options: Options,
  requestedModules: string[],
): Promise<void> {
  const configPath = globalModulesConfigPath();
  const config = await readGlobalModuleConfig(configPath);

  for (const execName in config) {
    const module = config[execName];

    if (
      requestedModules.length && requestedModules.indexOf(execName) === -1
    ) {
      continue;
    }

    // Get latest release
    const latestRelease = await getLatestVersion(
      module.registry,
      module.moduleName,
      module.owner,
    );

    // Basic safety net
    if (!module.version || !semver.valid(module.version)) {
      continue;
    }

    if (!latestRelease || !semver.valid(latestRelease)) {
      console.log(
        yellow(
          `Warning: could not find the latest version of ${module.moduleName}.`,
        ),
      );
      continue;
    }

    if (semver.eq(module.version, latestRelease)) {
      continue;
    }

    // Update the dependency
    const indexOfURL = module.args.findIndex((arg: string) =>
      arg.match(/https:\/\//)
    );

    const newArgs = module.args.slice();
    newArgs[indexOfURL] = newArgs[indexOfURL].replace(
      versionSubstitute,
      latestRelease,
    );

    const installation = Deno.run({
      cmd: [
        "deno",
        "install",
        "-f",
        ...newArgs,
      ],
    });

    const status = await installation.status();
    installation.close();

    if (status.success === false || status.code !== 0) {
      throw new Error(`Update failed for ${execName}`);
    }

    module.version = latestRelease;

    console.log(
      `${execName} (${module.moduleName}) ${yellow(module.version)} → ${
        green(latestRelease)
      }`,
    );
  }

  await writeGlobalModuleConfig(configPath, config);

  console.info("\nUpdated your dependencies!");
  Deno.exit();
}

async function updateLocalModules(
  options: Options,
  requestedModules: string[],
): Promise<void> {
  /** Gather the path to the user's dependency file using the CLI arguments */
  let pathToDepFile = "";
  try {
    pathToDepFile = Deno.realPathSync("./" + options.file);
  } catch (err) {
    // Dependency file doesn't exist
    console.error(
      "No dependency file was found in your current working directory. Exiting...",
    );
    Deno.exit(1);
  }

  /** Creates an array of strings from each line inside the dependency file.
   * Only extracts lines that contain "https://" to strip out non-import lines. */
  const dependencyFileContents: string[] = decoder
    .decode(Deno.readFileSync(pathToDepFile))
    .split("\n")
    .filter((line) => line.indexOf("https://") > 0);

  if (dependencyFileContents.length === 0) {
    console.warn(
      "Your dependency file does not contain any imported modules. Exiting...",
    );
    Deno.exit(1);
  }

  /** For each import line in the users dependency file, collate the data ready to be re-written
   * if it can be updated.
   * Skips the dependency if it is not versioned (no need to try to update it) */
  const dependenciesToUpdate: Array<ModuleToUpdate> = [];
  for (const line of dependencyFileContents) {
    let { moduleName, versionURL, registry, owner, version } = analyzeURL(line);

    // TODO(@qu4k): edge case: dependency isn't a module, for example: from
    //  "https://x.nest.land/std@version/version.ts";, will return -> "version.ts";
    // Issue: "Mandarine.TS" is a module while "version.ts" isn't

    // Now we have the name, ignore dependency if requested dependencies are set and it isn't one requested
    if (
      requestedModules.length && requestedModules.indexOf(moduleName) === -1
    ) {
      continue;
    }

    // Get latest release
    const latestRelease = await getLatestVersion(registry, moduleName, owner);

    // Basic safety net

    if (!version || !semver.valid(version)) {
      continue;
    }

    if (!latestRelease || !semver.valid(latestRelease)) {
      console.log(
        yellow(`Warning: could not find the latest version of ${moduleName}.`),
      );
      continue;
    }

    if (semver.eq(version, latestRelease)) {
      continue;
    }

    // Collate the dependency
    dependenciesToUpdate.push({
      line,
      versionURL,
      latestRelease,
    });

    console.log(`${moduleName} ${yellow(version)} → ${green(latestRelease)}`);
  }

  // If no modules are needed to update then exit
  if (dependenciesToUpdate.length === 0) {
    console.info("\nYour dependencies are already up to date!");
    Deno.exit();
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

  console.info("\nUpdated your dependencies!");
  Deno.exit();
}

type Arguments = [string[]];

interface Options {
  file: string;
  global: boolean;
}
