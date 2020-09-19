import {
  base64,
  expandGlobSync,
  relative,
  resolve,
  walkSync,
} from "../../deps.ts";
import type { Config } from "./config.ts";

export interface MatchedFile {
  fullPath: string;
  path: string;
  lstat: Deno.FileInfo;
}

export function matchFiles(config: Config): MatchedFile[] {
  let matched: MatchedFile[] = [];
  config.files.push(config.entry);

  for (let file of config.files) {
    let matches = [
      ...expandGlobSync(file, {
        root: Deno.cwd(),
        extended: true,
      }),
    ]
      .map((file) => ({
        fullPath: file.path.replace(/\\/g, "/"),
        path: "/" + relative(Deno.cwd(), file.path).replace(/\\/g, "/"),
        lstat: Deno.lstatSync(file.path),
      }));
    matched.push(...matches);
  }

  matched = matched.filter((file) => file.lstat.isFile);
  matched = matched.filter((file) => {
    if (config?.ignore?.denies.some((rgx) => rgx.test(file.path.substr(1)))) {
      return config.ignore.accepts.some((rgx) => rgx.test(file.path.substr(1)));
    }
    return true;
  });

  return matched;
}

export function readFiles(matched: MatchedFile[]): { [x: string]: string } {
  function readFileBtoa(path: string): string {
    const data = Deno.readFileSync(path);
    return base64.fromUint8Array(data);
  }

  return matched.map((el) =>
    [el, readFileBtoa(el.fullPath)] as [typeof el, string]
  ).reduce((p, c) => {
    p[c[0].path] = c[1];
    return p;
  }, {} as { [x: string]: string });
}
