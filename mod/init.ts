import { init } from "../src/commands/init.ts";

/** Permissions used
 * --allow-read="./"
 * --allow-write="./egg.json","./egg.yml","./egg.yaml"
 */
await init.parse(Deno.args);
