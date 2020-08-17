import {
  basename,
  Command,
  resolve,
  Confirm,
  Input,
  List,
  log,
  Select,
  parseURL,
  cyan,
  green,
  blue,
  gray,
  bold,
  red,
  italic,
} from "../../deps.ts";
import { dependencyTree, resolveURL, DependencyTree } from "../dependencyTree.ts";
import { DefaultOptions } from "../commands.ts";
import { version } from "../version.ts";
import { setupLog } from "../log.ts";

/** Info Command. */
async function infoCommand(options: DefaultOptions, file: string) {
  await setupLog(options.debug);

  const path = file.match(/https?:\/\//) ? file : resolve(Deno.cwd(), file)
  const url = resolveURL(path)

  const deps = await dependencyTree(url);
  prettyTree(url, deps, "", true);
}

function prettyTree(
  name: string,
  tree: DependencyTree,
  indent: string,
  last: boolean,
) {
  let line = indent;
  if (last) {
    line += "└─";
    indent += "  ";
  } else {
    line += "├─";
    indent += "│ ";
  }

  console.log(line + beautifyDependency(name));

  for (let i = 0; i < tree.length; i++) {
    const { path, imports } = tree[i];
    prettyTree(path, imports, indent, i === tree.length - 1);
  }
}

function formatVersion(version: string) {
  if (version === "" || version === undefined) {
    return red(italic("latest"))
  }
  return italic(version)
}

function formatPath(path: string) {
  return gray(italic(path))
}

function beautifyDependency(dep: string) {
  if (dep === "") {
    return red("Unable to resolve dependencies.");
  }
  if (dep.match(/^file:\/\/\//)) {
    return `${bold("Local")} ${gray(italic(dep.split("file:///")[1]))}`
  }
  try {
    const { registry, name, version, owner, relativePath } = parseURL(dep);
    switch (registry) {
      case "x.nest.land":
        return `${green("Nest.land")} ${bold(name)} ${formatVersion(version)} ${
          formatPath(relativePath)
        }`;

      case "deno.land":
        return `${cyan("Deno.land")} ${bold(name)} ${formatVersion(version)} ${
          formatPath(relativePath)
        }`;

      case "raw.githubusercontent.com":
        return `${blue("Github")} ${bold(`${owner}/${name}`)} ${
          formatVersion(version)
        } ${formatPath(relativePath)}`;

      case "denopkg.com":
        return `${blue("Denopkg.com")} ${bold(`${owner}/${name}`)} ${
          formatVersion(version)
        } ${formatPath(relativePath)}`;

      default:
        return dep;
    }
  } catch {
    return dep;
  }
}

type Arguments = [string];

export const info = new Command<DefaultOptions, Arguments>()
  .version(version)
  .arguments("<file:string>")
  .description("Dependency tree of the source file.")
  .action(infoCommand);
