import { Command, installHatcher, log } from "../../deps.ts";
import type { DefaultOptions } from "../commands.ts";
import { version } from "../version.ts";
import { setupLog } from "../utilities/log.ts";

export async function install(
  options: Options,
  ...args: string[]
): Promise<void> {
  await setupLog(options.debug);

  /** help option need to be parsed manually */
  if (["-h", "--help", "help"].includes(args[0])) {
    installCommand.help();
    return;
  }

  await installHatcher(args);
}

const desc = `Add update notification to any CLI.

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

export type Options = DefaultOptions;
export type Arguments = string[];

export const installCommand = new Command<Options, Arguments>()
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
  .action(install);
