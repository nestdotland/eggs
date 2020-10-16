import { apiFetch, ENDPOINT } from "./common.ts";

type StringMap = {
  [key: string]: string;
};

export async function postResource<T>(
  query: string,
  headers: StringMap,
  data: Record<string, unknown>,
): Promise<T | undefined> {
  // TODO(@qu4k): add test resource
  try {
    const response = await apiFetch(`${ENDPOINT}${query}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(data),
    });

    if (!response || !response.ok) return undefined;
    const value = await response.json();
    return value as T;
  } catch {
    return undefined;
  }
}

export interface PublishResponse {
  token: string;
  name: string;
  version: string;
  owner: string;
}

export interface PublishModule extends Record<string, unknown> {
  name: string;
  description?: string;
  repository?: string;
  version: string;
  unlisted?: boolean;
  upload: boolean;
  entry?: string;
  latest?: boolean;
  stable?: boolean;
}

export async function postPublishModule(
  key: string,
  module: PublishModule,
): Promise<PublishResponse | undefined> {
  const response: PublishResponse | undefined = await postResource(
    "/api/publish",
    { "Authorization": key },
    module,
  );
  return response;
}

export interface PiecesResponse {
  name: string;
  files: { [x: string]: string };
}

export async function postPieces(
  uploadToken: string,
  pieces: StringMap,
): Promise<PiecesResponse | undefined> {
  const response: PiecesResponse | undefined = await postResource(
    "/api/piece",
    { "X-UploadToken": uploadToken },
    {
      pieces,
      end: true,
    },
  );
  return response;
}
