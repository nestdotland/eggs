import { existsSync, join } from "../../deps.ts";
import { homedir } from "./files.ts";

export const ENDPOINT = Deno.env.get("EGGS_ENDPOINT") || "https://x.nest.land";
export const keySuffix = (ENDPOINT === "https://x.nest.land")
  ? ""
  : `-${ENDPOINT.replace(/[^A-Za-z0-9-_.]/g, "-")}`;

export async function getAPIKey(): Promise<string> {
  if (
    !existsSync(join(homedir(), `.nest-api-key${keySuffix}`))
  ) {
    return ""; // empty string
  }
  const decoder = new TextDecoder("utf-8");
  return decoder.decode(
    await Deno.readFile(join(homedir(), `.nest-api-key${keySuffix}`)),
  );
}
