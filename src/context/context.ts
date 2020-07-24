import { Config, defaultConfig, readConfig } from "./config.ts";
import { defaultIgnore, Ignore, readIgnore } from "./ignore.ts";

export interface Context {
  config?: Partial<Config>;
  ignore: Ignore;
}

export async function gatherContext(wd: string = Deno.cwd()): Promise<Context> {
  let config: Partial<Config> | undefined = undefined;
  const configPath = defaultConfig(wd);
  if (configPath) {
    try {
      config = await readConfig(configPath);
    } catch (err) {
      throw err;
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
    config,
    ignore,
  };
}
