import { Config } from "../config.ts";
import { ENDPOINT, apiFetch } from "./common.ts";

type StringMap = {
  [key: string]: string;
};

export async function postResource<T>(
  query: string,
  headers: StringMap,
  data: object,
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
  } catch (_) {
    return undefined;
  }
}

export interface PublishResponse {
  token: string;
  name: string;
  version: string;
  owner: string;
}

export async function postPublishModule(
  key: string,
  module: Config,
  latest: boolean,
): Promise<PublishResponse | undefined> {
  let response: PublishResponse | undefined = await postResource(
    "/api/publish",
    { "Authorization": key },
    {
      name: module.name,
      description: module.description,
      repository: module.repository,
      version: module.version,
      unlisted: module.unlisted,
      upload: true,
      entry: module.entry,
      latest: latest,
      stable: module.stable,
    },
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
  let response: PiecesResponse | undefined = await postResource(
    "/api/piece",
    { "X-UploadToken": uploadToken },
    {
      pieces,
      end: true,
    },
  );
  return response;
}
