import {
  existsSync,
  extname,
  join,
  parseYaml,
  stringifyYaml,
  writeJson,
} from "../../deps.ts";

/** Supported configuration formats. */
export enum ConfigFormat {
  YAML = "yml",
  JSON = "json",
}

/** Configuration options.
 * All fields are optional but most
 * commands require at least some. */
export interface Config {
  name: string;
  entry?: string;
  description?: string;
  repository?: string;
  version?: string;
  stable?: boolean;
  unlisted?: boolean;
  fmt?: boolean;

  files?: string[];
}

/** Filenames of the default configs.
 * The `defaultConfig` method checks
 * if one of this config files is
 * available in the cwd. */
const DEFAULT_CONFIGS = [
  "egg.json",
  "egg.yaml",
  "egg.yml",
];

/** Get default config in cwd. */
export function defaultConfig(wd: string = Deno.cwd()): string | undefined {
  return DEFAULT_CONFIGS.find((path) => {
    return existsSync(join(wd, path));
  });
}

/** Get config format for provided path.
 * @param path configuration file path */
export function configFormat(path: string): ConfigFormat {
  const ext = extname(path);
  if (ext.match(/^.ya?ml$/)) return ConfigFormat.YAML;
  return ConfigFormat.JSON;
}

/** writeYaml. (similar to writeJson)
 * @private */
async function writeYaml(filename: string, content: string): Promise<void> {
  return Deno.writeFileSync(filename, new TextEncoder().encode(content));
}

/** Write config with specific provided format. */
export async function writeConfig(
  data: Partial<Config>,
  format: ConfigFormat,
): Promise<void> {
  switch (format) {
    case ConfigFormat.YAML:
      await writeYaml(`egg.yml`, stringifyYaml(data));
      break;
    case ConfigFormat.JSON:
      await writeJson("egg.json", data, { spaces: 2 });
      break;
  }
}

/** Read configuration from provided path. */
export async function readConfig(path: string): Promise<Partial<Config>> {
  const format = configFormat(path);
  const data = await Deno.readTextFile(path);
  return parseConfig(data, format);
}

/** Parse configuration (provided as string)
 * for specific provided format */
export function parseConfig(
  data: string,
  format: ConfigFormat,
): Partial<Config> {
  if (format == ConfigFormat.YAML) {
    return (parseYaml(data) ?? {}) as Config;
  }
  return JSON.parse(data) as Config;
}

export function ensureCompleteConfig(
  config: Partial<Config>,
): config is Config {
  if (!config.name) return false;
  return true;
}
