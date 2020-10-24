import { log } from "../../deps.ts";

import { Config, defaultConfig, readConfig } from "./config.ts";
import { defaultIgnore, Ignore, readIgnore } from "./ignore.ts";

export async function gatherContext(
  wd: string = Deno.cwd(),
): Promise<[Partial<Config> | undefined, Ignore | undefined]> {
  let config: Partial<Config> = {};
  let ignore: Ignore = {
    accepts: [],
    denies: [],
    extends: [],
  };
  const configPath = await defaultConfig(wd);

  if (configPath) {
    try {
      config = await readConfig(configPath);
    } catch (err) {
      log.error("Unable to read config file.", err);
      return [undefined, undefined];
    }
  }

  const ignorePath = await defaultIgnore(wd);
  if (ignorePath) {
    try {
      ignore = await readIgnore(ignorePath);
    } catch (err) {
      throw err;
    }
    return [config, ignore];
  }

  return [config, undefined];
}
