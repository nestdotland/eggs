import { existsSync } from "../../deps.ts";

export function envHOMEDIR(): string {
  return Deno.env.get("HOME") || Deno.env.get("HOMEPATH") ||
    Deno.env.get("USERPROFILE") || "/";
}

export function envExistREADME(): boolean {
  return existsSync("README.md");
}
