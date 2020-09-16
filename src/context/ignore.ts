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
    return parseIgnore(data, basename(path));
  } catch (err) {
    throw new Error(`Error while reading ${path}: ${err}`);
  }
}

export async function parseIgnore(
  data: string,
  name = ".eggignore",
): Promise<Ignore> {
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
    const extends_ = line.startsWith("extends ");
    if (accepts) line = line.substr(1);
    if (extends_) line = line.substr(8);
    try {
      if (extends_) {
        if (line.match(/.gitignore$/)) {
          ignore.denies.push(globToRegExp(".git*/**"));
        }
        const files = expandGlob(line, { root: Deno.cwd() });
        for await (const file of files) {
          const path = relative(Deno.cwd(), file.path).replace(/\\/g, "/");
          const { accepts, denies } = await readIgnore(path);
          ignore.accepts.concat(accepts);
          ignore.denies.concat(denies);
        }
      } else {
        const pattern = globToRegExp(line);
        if (accepts) {
          ignore.accepts.push(pattern);
        } else {
          ignore.denies.push(pattern);
        }
      }
    } catch (err) {
      log.error(`parsing ${name} file. Error at line ${n}`);
    }
  }
  return ignore;
}
