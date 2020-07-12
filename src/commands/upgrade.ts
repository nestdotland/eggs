import { Command, getLatestVersionFromNestRegistry, log } from "../../deps.ts";

import { version } from "../version.ts";

export const upgrade = new Command()
  .version(version)
  .description("Upgrade the current nest.land CLI.")
  .action(async () => {
    let upgradeProcess = Deno.run({
      cmd: [
        "deno",
        "install",
        "--unstable",
        "-A",
        "-f",
        "-n",
        "eggs",
        `https://x.nest.land/eggs@${await getLatestVersionFromNestRegistry(
          "eggs",
        )}/mod.ts`,
      ],
      stdout: "piped",
      stderr: "piped",
    });
    await upgradeProcess.status();
    upgradeProcess.close();
    log.info("Successfully upgraded eggs cli!");
  });
