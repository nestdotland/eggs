import { Command, getLatestVersionFromNestRegistry, log } from "../../deps.ts";

import { version } from "../version.ts";

async function upgradeCommand() {
  const newVersion = await getLatestVersionFromNestRegistry("eggs");
  if (newVersion === version) {
    log.info("You are already using the latest CLI version!");
    Deno.exit(0);
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
    ]
  });

  const status = await upgradeProcess.status();
  if (!status.success) {
    log.critical("Failed to upgrade to the latest CLI version!");
    Deno.exit(1);
  }

  log.info("Successfully upgraded eggs cli!");
}

export const upgrade = new Command()
  .version(version)
  .description("Upgrade the current nest.land CLI.")
  .action(upgradeCommand);
