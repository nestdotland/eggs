import {
  Command,
  resolve,
  parseURL,
  cyan,
  green,
  log,
  blue,
  rgb24,
  gray,
  bold,
  red,
  italic,
} from "../../deps.ts";
import {
  dependencyTree,
  DependencyTree,
} from "../dependencyTree.ts";
import { DefaultOptions } from "../commands.ts";
import { version } from "../version.ts";
import { setupLog } from "../log.ts";

const format = {
  redundant: gray("..."),
  circular: red("Circular import"),
  local: bold("Local"),
  nestLand: rgb24("N", 0x43c0ad) + rgb24("e", 0x52c0a2) +
    rgb24("s", 0x62bf97) + rgb24("t", 0x6cbf90) + rgb24(".", 0x80be83) +
    rgb24("l", 0x91be77) + rgb24("a", 0xa9bd67) + rgb24("n", 0xc9bc50) +
    rgb24("d", 0xd7bc47),
  denoLand: cyan("Deno.land"),
  github: blue("Github"),
  denopkgCom: green("Denopkg.com"),
};

/** Info Command. */
async function infoCommand(options: Options, file?: string) {
  await setupLog(options.debug);

  if (file) {
    const path = file.match(/https?:\/\//) ? file : resolve(Deno.cwd(), file);

    const deps = await dependencyTree(path, { fullTree: options.full });
    log.debug("Dependency tree", deps.tree[0]);
    prettyTree(deps.tree[0].path, deps.tree[0].imports, "", true, options);

    console.log();
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
    line += "└─";
    indent += "  ";
  } else {
    line += "├─";
    indent += "│ ";
  }

  console.log(`${line}${options.raw ? name : beautifyDependency(name)}`);

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

      default:
        return dep;
    }
  } catch {
    return dep;
  }
}

interface Options extends DefaultOptions {
  full: boolean;
  raw: boolean;
}

type Arguments = [string];

export const info = new Command<Options, Arguments>()
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
  .action(infoCommand);
