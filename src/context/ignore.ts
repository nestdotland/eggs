import {
  basename,
  existsSync,
  expandGlob,
  globToRegExp,
  join,
  log,
  relative,
} from "../../deps.ts";

export interface Ignore {
  accepts: RegExp[];
  denies: RegExp[];
  extends: string[];
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
  try {
    const data = await Deno.readTextFile(path);
    const ignore = parseIgnore(data, basename(path));
    while (ignore.extends.length > 0) {
      const pattern = ignore.extends.pop() as string;
      if (pattern.match(/.gitignore$/)) {
        ignore.denies.push(globToRegExp(".git*/**"));
      }
      const files = expandGlob(pattern, { root: Deno.cwd() });
      for await (const file of files) {
        const path = relative(Deno.cwd(), file.path).replace(/\\/g, "/");
        const { accepts, denies } = await readIgnore(path);
        ignore.accepts.concat(accepts);
        ignore.denies.concat(denies);
      }
    }
    return ignore;
  } catch (err) {
    throw new Error(`Error while reading ${path}: ${err}`);
  }
}

export function parseIgnore(
  data: string,
  name = "",
): Ignore {
  const ignore: Ignore = {
    accepts: [],
    denies: [],
    extends: [],
  };
  const lines = data.split(/\r\n|\r|\n/).map((_) => _.replace(/^\s*/g, ""));
  let n = 1;
  for (let line of lines) {
    n++;
    if (!line) continue;
    if (line.startsWith("#")) continue;
    const accepts = line.startsWith("!");
    const extends_ = line.match(/^extends /);
    if (accepts) line = line.substr(1);
    if (extends_) {
      ignore.extends.push(line.substr(8));
      continue;
    }
    try {
      const pattern = globToRegExp(line);
      if (accepts) {
        ignore.accepts.push(pattern);
      } else {
        ignore.denies.push(pattern);
      }
    } catch (err) {
      log.error(`parsing ${name} file. Error at line ${n}`);
    }
  }
  return ignore;
}
