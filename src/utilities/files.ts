import { existsSync } from "../../deps.ts";

export function homedir(): string {
  return Deno.env.get("HOME") || Deno.env.get("HOMEPATH") ||
    Deno.env.get("USERPROFILE") || "/";
}

export function readmeExists(): boolean {
  return existsSync("README.md");
}
