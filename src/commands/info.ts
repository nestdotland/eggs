import {
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

const deps = await dependencyTree(resolveURL("./init.ts"));

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

function beautifyDependency(dep: string) {
  if (dep === "") {
    return red("Unable to resolve dependencies.");
  }
  try {
    const { registry, name, version, owner, relativePath } = parseURL(dep);
    switch (registry) {
      case "x.nest.land":
        return `${green("Nest.land")} ${bold(name)} ${italic(version)} ${
          gray(italic(relativePath))
        }`;

      case "deno.land":
        return `${cyan("Deno.land")} ${bold(name)} ${italic(version)} ${
          gray(italic(relativePath))
        }`;

      case "raw.githubusercontent.com":
        return `${blue("Github")} ${bold(`${owner}/${name}`)} ${
          italic(version)
        } ${gray(italic(relativePath))}`;

      case "denopkg.com":
        return `${blue("Denopkg.com")} ${bold(`${owner}/${name}`)} ${
          italic(version)
        } ${gray(italic(relativePath))}`;

      default:
        return dep;
    }
  } catch {
    return dep;
  }
}

prettyTree(resolveURL("./init.ts"), deps, "", true);
