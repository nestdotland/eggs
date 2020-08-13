import { Module } from "../module.ts";
import { ENDPOINT } from "./common.ts";
import { Yolk, Module as YolkModule } from "../../deps.ts";

/**
 * Create a new Yolk instance.
 */
const yolk = new Yolk(ENDPOINT);

/**
 * Fetch a module by its name
 * @param name Name of the module to retrieve
 */
export async function fetchModule(name: string): Promise<Module | undefined> {
  let module = await yolk.moduleByName(name);
  if (!module.data) return undefined;
  // This will be fixed in yolk
  // @ts-ignore
  return new Module(module.data.module);
}
