import {
  bold,
  Command,
  exists,
  getLatestVersion,
  GlobalModuleConfig,
  globalModulesConfigPath,
  installUpdateHandler,
  log,
  parseURL,
  readGlobalModuleConfig,
  semver,
  writeGlobalModuleConfig,
} from "../../deps.ts";
import type { DefaultOptions } from "../commands.ts";
import { version } from "../version/version.ts";
import { setupLog } from "../log.ts";

const installPrefix = "eggs--";
const oneDay = 1000 * 60 * 60 * 24;

const configPath = globalModulesConfigPath();

async function installCommand(
  options: DefaultOptions,
  ...args: string[]
): Promise<void> {
  await setupLog(options.debug);

  /** help option need to be parsed manually */
  if (["-h", "--help", "help"].includes(args[0])) {
    install.help();
    return;
  }

  const indexOfURL = args.findIndex((arg) => arg.match(/https:\/\//));
  const indexOfName = args.indexOf("-n");

  if (indexOfURL < 0) {
    log.error("You need to pass in a module URL.");
    return;
  }

  const url = args[indexOfURL];
  let { name, parsedURL, registry, owner, version } = parseURL(url);
  let alias: string;

  log.debug("Module info: ", name, parsedURL, registry, owner, version);

  const currentVersion = semver.valid(version) ??
    await getLatestVersion(registry, name, owner);

  if (!currentVersion || !semver.valid(currentVersion)) {
    log.warning(`Could not find the latest version of ${name}.`);
    await installModuleWithoutUpdates(args);
    return;
  }

  /** If no exec name is given, provide one */
  if (indexOfName < 0) {
    args.splice(indexOfURL, 0, installPrefix + name);
    args.splice(indexOfURL, 0, "-n");
    alias = name;
  } else {
    alias = args[indexOfName + 1];
    args[indexOfName + 1] = installPrefix + alias;
  }

  const executable = installPrefix + alias;

  await installModuleHandler(args);
  await installUpdateHandler(alias, executable);

  /** After installation, the URL is ready to be updated */
  args[args.findIndex((arg) => arg.match(/https:\/\//))] = parsedURL;

  const configExists = await exists(configPath);
  let config: GlobalModuleConfig | undefined;
  try {
    config = configExists ? await readGlobalModuleConfig() : {};

    if (config === undefined) return;
  } catch (err) {
    log.error(err);
    return;
  }

  config[executable] = {
    registry,
    name,
    alias,
    owner,
    version: currentVersion,
    arguments: args,
    lastUpdateCheck: Date.now(),
  };

  log.debug("Config: ", config);

  await writeGlobalModuleConfig(config);

  log.info(`Successfully installed ${bold(name)} !`);
}

async function installModuleHandler(args: string[]): Promise<void> {
  const options = args.filter((x) => x !== "-f");
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

  if (status.success === false || status.code !== 0) {
    throw new Error("Module handler installation failed.");
  }
}

async function installModuleWithoutUpdates(args: string[]): Promise<void> {
  const installation = Deno.run({
    cmd: [
      "deno",
      "install",
      ...args,
    ],
  });

  const status = await installation.status();
  installation.close();

  if (status.success === false || status.code !== 0) {
    throw new Error("Module installation failed.");
  }
}

const desc = `A simple wrapper around the ${
  bold("deno install")
} command to handle global script updates.

Installs a script as an executable in the installation root's bin directory.
  eggs install --allow-net --allow-read https://x.nest.land/std/http/file_server.ts
  eggs install https://x.nest.land/std/examples/colors.ts

To change the executable name, use -n/--name:
  eggs install --allow-net --allow-read -n serve https://x.nest.land/std/http/file_server.ts

The executable name is inferred by default:
  - Attempt to take the file stem of the URL path. The above example would
    become 'file_server'.
  - If the file stem is something generic like 'main', 'mod', 'index' or 'cli',
    and the path has no parent, take the file name of the parent path. Otherwise
    settle with the generic name.

To change the installation root, use --root:
  eggs install --allow-net --allow-read --root /usr/local https://x.nest.land/std/http/file_server.ts

The installation root is determined, in order of precedence:
  - --root option
  - DENO_INSTALL_ROOT environment variable
  - $HOME/.deno

These must be added to the path manually if required.`;

type Arguments = string[];

export const install = new Command<DefaultOptions, Arguments>()
  .version(version)
  .description(desc)
  .arguments("[options...:string]")
  .option("-A, --allow-all", "Allow all permissions")
  .option("--allow-env", "Allow environment access")
  .option("--allow-hrtime", "Allow high resolution time measurement")
  .option("--allow-net=<allow-net>", "Allow network access")
  .option("--allow-plugin", "Allow loading plugins")
  .option("--allow-read=<allow-read>", "Allow file system read access")
  .option("--allow-run", "Allow running subprocesses")
  .option("--allow-write=<allow-write>", "Allow file system write access")
  .option(
    "--cert <FILE>",
    "Load certificate authority from PEM encoded file",
  )
  .option(
    "-f, --force",
    "Forcefully overwrite existing installation",
  )
  .option(
    "-L, --log-level <log-level> ",
    "Set log level [possible values: debug, info]",
  )
  .option("-n, --name <name>", "Executable file name")
  .option("-q, --quiet", "Suppress diagnostic output")
  .option("--root <root>", "Installation root")
  .option("--unstable", "Enable unstable APIs")
  /** Unknown options cannot be parsed */
  .useRawArgs()
  .action(installCommand);
