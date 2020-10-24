import { IModule, Module } from "./module.ts";
import { apiFetch, ENDPOINT } from "./common.ts";

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
  const module: IModule | undefined = await fetchResource(
    `/api/package/${name}`,
  );
  if (!module) return undefined;
  return new Module(module);
}
