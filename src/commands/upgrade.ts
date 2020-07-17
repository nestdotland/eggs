import {
  Command,
  getLatestVersionFromNestRegistry,
  log,
  semver,
} from "../../deps.ts";

import { version } from "../version.ts";
import { setupLog } from "../log.ts";

async function upgradeCommand(options: Options) {
  await setupLog(options.debug);

  const newVersion = await getLatestVersionFromNestRegistry("eggs");
  if (semver.eq(newVersion, version)) {
    log.info("You are already using the latest CLI version!");
    return;
  }

  const upgradeProcess = Deno.run({
    cmd: [
      "deno",
      "install",
      "--unstable",
      "-A",
      "-f",
      "-n",
      "eggs",
      `https://x.nest.land/eggs@${newVersion}/mod.ts`,
    ],
    stdout: "piped",
    stderr: "piped",
  });

  const status = await upgradeProcess.status();
  upgradeProcess.close()

  const stdout = new TextDecoder("utf-8").decode(await upgradeProcess.output());
  const stderr = new TextDecoder("utf-8").decode(
    await upgradeProcess.stderrOutput(),
  );
  
  log.debug("stdout: ", stdout)
  log.debug("stderr: ", stderr)

  if (!status.success) {
    throw new Error("Failed to upgrade to the latest CLI version!");
  }

  log.info("Successfully upgraded eggs cli!");
}

export const upgrade = new Command<Options, Arguments>()
  .version(version)
  .description("Upgrade the current nest.land CLI.")
  .action(upgradeCommand);

type Options = { debug: boolean };
type Arguments = [];
