import { existsSync, join, log } from "../deps.ts";

import { ENDPOINT } from "./api/common.ts";
import { envHOMEDIR } from "./utilities/environment.ts";

export const KEY_SUFFIX = (ENDPOINT === "https://x.nest.land")
  ? ""
  : `-${slugify(ENDPOINT)}`;

export const KEY_FILE = `.nest-api-key${KEY_SUFFIX}`;

function slugify(text: string) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

export async function writeAPIKey(key: string): Promise<void> {
  const keyPath = join(envHOMEDIR(), KEY_FILE);
  log.debug("Key path", keyPath);
  await Deno.writeFile(keyPath, new TextEncoder().encode(key));
}

export async function getAPIKey(): Promise<string> {
  if (
    !existsSync(join(envHOMEDIR(), KEY_FILE))
  ) {
    return ""; // empty string
  }
  const decoder = new TextDecoder("utf-8");
  return decoder.decode(
    await Deno.readFile(join(envHOMEDIR(), KEY_FILE)),
  );
}
