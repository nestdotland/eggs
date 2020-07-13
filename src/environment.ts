export function envHOMEDIR(): string {
  return Deno.env.get("HOME")
    ?? Deno.env.get("HOMEPATH")
    ?? Deno.env.get("USERPROFILE")
    ?? "/";
}

export function envENDPOINT(): string {
  return Deno.env.get("EGGS_ENDPOINT")
    ?? "https://x.nest.land";
}
