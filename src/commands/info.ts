import {
  blue,
  bold,
  Command,
  cyan,
  DependencyTree,
  dependencyTree,
  gray,
  green,
  italic,
  log,
  magenta,
  parseURL,
  red,
  resolve,
  rgb24,
  yellow,
} from "../../deps.ts";
import type { DefaultOptions } from "../commands.ts";
import { version } from "../version.ts";
import { setupLog, spinner } from "../utilities/log.ts";

const format = {
  redundant: gray("..."),
  circular: red("circular import"),
  local: bold("local"),
  nestLand: rgb24("n", 0x43c0ad) + rgb24("e", 0x52c0a2) +
    rgb24("s", 0x62bf97) + rgb24("t", 0x6cbf90) + rgb24(".", 0x80be83) +
    rgb24("l", 0x91be77) + rgb24("a", 0xa9bd67) + rgb24("n", 0xc9bc50) +
    rgb24("d", 0xd7bc47),
  denoLand: cyan("deno.land"),
  github: blue("github.com"),
  denopkgCom: green("denopkg.com"),
  skypack: magenta("cdn.skypack.dev"),
  jspm: yellow("jspm.dev"),
};

/** Info Command. */
export async function info(options: Options, file?: string) {
  await setupLog(options.debug);

  if (file) {
    const path = file.match(/https?:\/\//) ? file : resolve(Deno.cwd(), file);

    const wait = spinner.info("Scanning dependency tree...");

    let importsFound = 0;
    let importsResolved = 0;

    const progress = () =>
      wait.text = (`${importsResolved} / ${importsFound} imports`);
    const onImportFound = (count: number) => {
      importsFound = count;
      progress();
    };
    const onImportResolved = (count: number) => {
      importsResolved = count;
      progress();
    };

    const deps = await dependencyTree(
      path,
      {
        fullTree: options.full,
        onImportFound,
        onImportResolved,
      },
    );
    wait.stop();
    log.debug("Dependency tree", deps.tree[0]);
    prettyTree(deps.tree[0].path, deps.tree[0].imports, "", true, options);

    log.info("");
    log.info(`Found ${deps.count} dependencies.`);
    if (deps.circular) {
      log.warning("This dependency tree contains circular imports!");
    }
  } else {
    const info = Deno.run({
      cmd: ["deno", "info"],
      stderr: "inherit",
      stdout: "inherit",
    });

    await info.status();
    info.close();
  }
}

function prettyTree(
  name: string,
  tree: DependencyTree,
  indent: string,
  last: boolean,
  options: Options,
) {
  let line = indent;
  if (last) {
    line += "└─" + (tree.length > 0 ? "┬" : "─");
    indent += "  ";
  } else {
    line += "├─" + (tree.length > 0 ? "┬" : "─");
    indent += "│ ";
  }

  console.log(`${line} ${options.raw ? name : beautifyDependency(name)}`);

  for (let i = 0; i < tree.length; i++) {
    const { path, imports } = tree[i];
    prettyTree(path, imports, indent, i === tree.length - 1, options);
  }
}

function formatVersion(version: string) {
  if (version === "" || version === undefined) {
    return red(italic("latest"));
  }
  return italic(version);
}

function formatPath(path: string) {
  return gray(italic(path));
}

function beautifyDependency(dep: string) {
  if (dep.match(/^\[Error/)) {
    return red(dep);
  }
  if (dep.match(/^\[Redundant/)) {
    return format.redundant;
  }
  if (dep.match(/^\[Circular/)) {
    return format.circular;
  }
  if (dep.match(/^file:\/\/\//)) {
    return `${format.local} ${gray(italic(dep.split("file:///")[1]))}`;
  }
  try {
    const { registry, name, version, owner, relativePath } = parseURL(dep);
    switch (registry) {
      case "x.nest.land":
        return `${format.nestLand} ${bold(name)} ${formatVersion(version)} ${
          formatPath(relativePath)
        }`;

      case "deno.land":
        return `${format.denoLand} ${bold(name)} ${formatVersion(version)} ${
          formatPath(relativePath)
        }`;

      case "raw.githubusercontent.com":
        return `${format.github} ${bold(`${owner}/${name}`)} ${
          formatVersion(version)
        } ${formatPath(relativePath)}`;

      case "denopkg.com":
        return `${format.denopkgCom} ${bold(`${owner}/${name}`)} ${
          formatVersion(version)
        } ${formatPath(relativePath)}`;

      case "cdn.skypack.dev":
        return `${format.skypack} ${bold(name)} ${formatVersion(version)}`;

      case "jspm.dev":
        return `${format.jspm} ${bold(name)} ${formatVersion(version)}`;

      default:
        return dep;
    }
  } catch {
    return dep;
  }
}

export interface Options extends DefaultOptions {
  full: boolean;
  raw: boolean;
}
export type Arguments = [string];

export const infoCommand = new Command<Options, Arguments>()
  .version(version)
  .arguments("[file:string]")
  .option(
    "-f, --full",
    "Displays the complete tree, without hiding redundant imports. Not recommended for large trees.",
  )
  .option(
    "-r, --raw",
    "Displays the raw URLs, without modifying them.",
  )
  .description(
    "Displays the dependency tree of a file in a more readable, colorful way. Useful when you have imports that redirect urls (like nest.land).",
  )
  .action(info);
