export function envHOMEDIR(): string {
  return Deno.env.get("HOME") ?? // for linux / mac
    Deno.env.get("USERPROFILE") ?? // for windows
    "/";
}

export function envENDPOINT(): string {
  return Deno.env.get("EGGS_ENDPOINT") ??
    "https://x.nest.land";
}
