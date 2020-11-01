import { Command, log, NestLand, semver } from "../../deps.ts";
import type { DefaultOptions } from "../commands.ts";

import { version } from "../version.ts";
import { setupLog } from "../utilities/log.ts";

export async function upgrade(options: DefaultOptions) {
  await setupLog(options.debug);

  const newVersion = await NestLand.latestVersion("eggs");
  if (!newVersion) {
    log.error("Could not retrieve latest version.");
    return;
  }
  if (semver.eq(newVersion, version)) {
    log.info("You are already using the latest CLI version!");
    return;
  }

  const upgradeProcess = Deno.run({
    cmd: [
      "deno",
      "install",
      "--unstable",
      "-Afq",
      `https://x.nest.land/eggs@${newVersion}/eggs.ts`,
    ],
    stdout: "piped",
    stderr: "piped",
  });

  const status = await upgradeProcess.status();
  upgradeProcess.close();

  const stdout = new TextDecoder("utf-8").decode(await upgradeProcess.output());
  const stderr = new TextDecoder("utf-8").decode(
    await upgradeProcess.stderrOutput(),
  );

  log.debug("stdout: ", stdout);
  log.debug("stderr: ", stderr);

  if (!status.success) {
    throw new Error("Failed to upgrade to the latest CLI version!");
  }

  log.info("Successfully upgraded eggs cli!");
}

export type Options = DefaultOptions;
export type Arguments = [];

export const upgradeCommand = new Command<Options, Arguments>()
  .version(version)
  .description("Upgrade the current nest.land CLI.")
  .action(upgrade);
