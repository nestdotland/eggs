import { existsSync, extname, parseYaml, stringifyYaml, writeJson, } from "../deps.ts";

export enum ConfigFormat {
  YAML = "yml",
  JSON = "json",
}

export interface Config {
  name?: string;
  entry?: string;
  description?: string;
  repository?: string;
  version?: string;
  stable?: boolean;
  unlisted?: boolean;
  fmt?: boolean;

  files?: string[];
}

const DEFAULT_CONFIGS = [
  "egg.json",
  "egg.yaml",
  "egg.yml",
];

export function defaultConfig(): string | undefined {
  return DEFAULT_CONFIGS.find((path) => {
    return existsSync(path);
  });
}

export function configFormat(path: string): ConfigFormat {
  const ext = extname(path);
  if (ext.match(/^.ya?ml$/)) return ConfigFormat.YAML;
  return ConfigFormat.JSON;
}

async function writeYaml(filename: string, content: string): Promise<void> {
  return Deno.writeFileSync(filename, new TextEncoder().encode(content));
}

export async function writeConfig(
  data: Partial<Config>,
  format: ConfigFormat,
): Promise<void> {
  switch (format) {
    case ConfigFormat.YAML:
      await writeYaml(`egg.yml`, stringifyYaml(data));
      break;
    case ConfigFormat.JSON:
      await writeJson("egg.json", data, {spaces: 2});
      break;
  }
}

export async function readConfig(path: string): Promise<Config> {
  const decoder = new TextDecoder("utf-8");
  const format = configFormat(path);
  const data = decoder.decode(
    await Deno.readFile(path),
  );
  return parseConfig(data, format);
}

export function parseConfig(data: string, format: ConfigFormat): Config {
  if (format == ConfigFormat.YAML) {
    return (parseYaml(data) ?? {}) as Config;
  }
  return JSON.parse(data) as Config;
}
