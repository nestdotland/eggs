import { ENDPOINT } from "./common.ts";
import { publish, PublishModule } from "../../deps.ts";

type StringMap = {
  [key: string]: string;
};

export async function postPublishModule(
  module: PublishModule,
  files: StringMap,
): Promise<unknown> {
  let response = await publish(module, files, ENDPOINT);
  return response;
}
