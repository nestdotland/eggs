import {
  exists,
  extname,
  join,
  parseYaml,
  semver,
  stringifyYaml,
} from "../../deps.ts";
import { writeJson } from "../utilities/json.ts";

/** Supported configuration formats. */
export enum ConfigFormat {
  YAML = "yml",
  JSON = "json",
}

/** Configuration options.
 * All fields are optional but most
 * commands require at least some. */
export interface Config {
  $schema: string;

  name: string;
  entry: string;
  description: string;
  homepage: string;
  unstable?: boolean;
  unlisted: boolean;

  version: string;
  releaseType?: semver.ReleaseType;

  files?: string[];
  ignore?: string[];

  yes?: boolean;
  checkFormat?: boolean | string;
  checkTests?: boolean | string;
  checkInstallation?: boolean;
  check: boolean;
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
export async function defaultConfig(
  wd: string = Deno.cwd(),
): Promise<string | undefined> {
  for (const path of DEFAULT_CONFIGS) {
    if (await exists(join(wd, path))) return path;
  }
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
      await writeYaml(join(Deno.cwd(), "egg.yml"), stringifyYaml(data));
      break;
    case ConfigFormat.JSON:
      await writeJson(join(Deno.cwd(), "egg.json"), data, { spaces: 2 });
      break;
    default:
      throw new Error(`Unknown config format: ${format}`);
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
    return (parseYaml(data) ?? {}) as Partial<Config>;
  }
  return JSON.parse(data) as Partial<Config>;
}
