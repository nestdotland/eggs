import { globToRegExp, log, existsSync, join } from "../../deps.ts";

export interface Ignore {
  accepts: RegExp[];
  denies: RegExp[];
}

const DEFAULT_IGNORES = [
  ".eggignore",
];

export function defaultIgnore(wd: string = Deno.cwd()): string | undefined {
  return DEFAULT_IGNORES.find((path) => {
    return existsSync(join(wd, path));
  });
}

export async function readIgnore(path: string): Promise<Ignore> {
  const data = await Deno.readTextFile(path);
  return parseIgnore(data);
}

export function parseIgnore(
  data: string,
): Ignore {
  const ignore: Ignore = {
    accepts: [],
    denies: [],
  };
  const lines = data.split(/\r\n|\r|\n/).map((_) => _.replace(/\s/g, ""));
  let n = 1;
  for (let line of lines) {
    n++;
    if (!line) continue;
    if (line.startsWith("#")) continue;
    const accepts = line.startsWith("!");
    if (accepts) line = line.substr(1);
    try {
      const pattern = globToRegExp(line, { extended: true, globstar: true });
      if (accepts) {
        ignore.accepts.push(pattern);
      } else {
        ignore.denies.push(pattern);
      }
    } catch (err) {
      log.error(`parsing .eggsignore file. error at line ${n}`);
    }
  }
  return ignore;
}
