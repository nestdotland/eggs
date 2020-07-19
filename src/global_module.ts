import { log, readJson, writeJson } from "../deps.ts";

export interface GlobalModule {
  registry: string;
  moduleName: string; // TODO(@qu4k): ugly
  installName: string; // TODO(@qu4k): ugly
  owner: string;
  version: string;
  args: string[];
  lastUpdateCheck: number;
}

export interface GlobalModuleConfig {
  [key: string]: GlobalModule;
}

export async function readGlobalModuleConfig(
  path: string,
): Promise<GlobalModuleConfig | undefined> {
  try {
    return await readJson(path) as GlobalModuleConfig;
  } catch {
    log.error("Config file doesn't exist.");
    return;
  }
}

export async function writeGlobalModuleConfig(
  path: string,
  config: GlobalModuleConfig,
): Promise<void> {
  await writeJson(path, config, { spaces: 2 });
}
