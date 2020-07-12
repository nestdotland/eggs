import { parse, stringify, writeJson } from "../deps.ts";

export type ConfigFormats = "yaml" | "yml" | "json";

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

async function writeYaml(filename: string, content: string): Promise<void> {
  return Deno.writeFileSync(filename, new TextEncoder().encode(content));
}

export async function writeConfig(
  data: Partial<Config>,
  format: ConfigFormats,
): Promise<void> {
  ["yaml", "yml"].includes(format)
    ? await writeYaml(`egg.${format}`, stringify(data))
    : await writeJson("egg.json", data, {spaces: 2});
}

export function parseConfig(data: string, format: ConfigFormats): Config {
  if (["yaml", "yml"].includes(format)) {
    return (parse(data) ?? {}) as Config;
  }
  return JSON.parse(data) as Config;
}
