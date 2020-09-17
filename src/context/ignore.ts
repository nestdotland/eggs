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
  const lines = data.split(/\r\n|\r|\n/).map((_) => _.replace(/^\s*/, ""));

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    // A blank line matches no files, so it can serve as a separator for readability.
    if (!line) continue;
    // A line starting with # serves as a comment. Put a backslash ("\") in front of
    // the first hash for patterns that begin with a hash.
    if (line.startsWith("#")) continue;
    // An optional prefix "!" which negates the pattern.
    const accepts = line.startsWith("!");
    // An optional prefix "extends " which imports other ignore files (.gitignore).
    const extends_ = line.startsWith("extends ");
    // Trailing spaces are ignored unless they are quoted with backslash ("\").
    line = line.replace(/(?<!\\)\s/g, "").replace(/(?:\\(.))/g, "$1");
    if (accepts) line = line.substr(1);
    if (extends_) {
      ignore.extends.push(line.substr(7));
      continue;
    }
    // If there is a separator at the beginning or middle (or both) of the pattern,
    // then the pattern is relative to the directory level of the particular .gitignore file itself.
    // Otherwise the pattern may also match at any level below the .gitignore level.
    if (line.replace(/\/$/, "").split("/").length === 1) line = `**/${line}`;
    // TODO(@oganexon): If there is a separator at the end of the pattern then the pattern will only match directories,
    // otherwise the pattern can match both files and directories.
    try {
      const pattern = globToRegExp(line);
      if (accepts) {
        ignore.accepts.push(pattern);
      } else {
        ignore.denies.push(pattern);
      }
    } catch (err) {
      log.error(`Parsing ${name} file. Error at line ${i + 1}`);
    }
  }
  return ignore;
}
