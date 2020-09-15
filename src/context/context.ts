import { log } from "../../deps.ts";

import { Config, defaultConfig, readConfig } from "./config.ts";
import { defaultIgnore, Ignore, readIgnore } from "./ignore.ts";

export async function gatherContext(
  wd: string = Deno.cwd(),
): Promise<Partial<Config> | undefined> {
  let config: Partial<Config> = {};
  const configPath = defaultConfig(wd);
  if (configPath) {
    try {
      config = await readConfig(configPath);
    } catch (err) {
      log.error("Unable to read config file.", err);
      return;
    }
  }

  let ignore: Ignore = {
    accepts: [],
    denies: [],
  };
  const ignorePath = defaultIgnore(wd);
  if (ignorePath) {
    try {
      ignore = await readIgnore(ignorePath);
    } catch (err) {
      throw err;
    }
  }

  return {
    ...config,
    ignore,
  };
}
