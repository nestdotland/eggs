import { envENDPOINT } from "../utilities/environment.ts";

export const ENDPOINT = envENDPOINT();

// TODO(@qu4k): develop mock api
let MOCK = false;

export function enableMockApi() {
  MOCK = true;
}

export async function apiFetch(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  return await fetch(input, init);
}
