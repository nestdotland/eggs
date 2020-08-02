import { Module } from "../module.ts";
import { apiFetch, ENDPOINT } from "./common.ts";
import { Yolk, Module as YolkModule } from "../../deps.ts";

/**
 * Create a new Yolk instance.
 */
// TODO(@divy-work): change url when deployed.
const yolk = new Yolk("http://localhost:8080");

export async function fetchResource<T>(query: string): Promise<T | undefined> {
  // TODO(@qu4k): add test resource
  try {
    const response = await apiFetch(`${ENDPOINT}${query}`);
    if (!response || !response.ok) return undefined;
    const value = await response.json();
    return value as T;
  } catch {
    return undefined;
  }
}

export async function fetchModule(name: string): Promise<Module | undefined> {
  let module = await yolk.moduleByName(name);
  if (!module.data) return undefined;
  return new Module(module.data[0]);
}
