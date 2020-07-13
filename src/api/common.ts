import { envENDPOINT } from "../environment.ts";

export const ENDPOINT = envENDPOINT();

let MOCK = false;
const store: object = {};

export function enableMockApi() {
  MOCK = true;
}

export async function apiFetch(
  input: Request | URL | string,
  init?: RequestInit,
): Promise<Response> {
  return await fetch(input, init);
}
