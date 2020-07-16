import { publish } from "../src/commands/publish.ts";

/** Permissions used
 * --allow-read="./","[PATH_TO-HOME]\.nest-api-key"
 * --allow-net="nest.land"
 * --allow-env
 */
await publish.parse(Deno.args);
