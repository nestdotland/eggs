import { parseURL, cyan, green, blue, gray, bold, italic } from "../../deps.ts";
import { dependencyTree, toURL, DependencyTree } from "../dependencyTree.ts";

const deps = await dependencyTree(toURL("./init.ts"));

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

  const unfoldedMap: Array<[string, DependencyTree]> = [];
  for (const value of tree) {
    unfoldedMap.push(value);
  }
  for (let i = 0; i < unfoldedMap.length; i++) {
    const [dep, subtree] = unfoldedMap[i];
    prettyTree(dep, subtree, indent, i === unfoldedMap.length - 1);
  }
}

function beautifyDependency(dep: string) {
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
        return `${blue("Github")} ${bold(`${owner}/${name}`)} ${italic(version)} ${
          gray(italic(relativePath))
        }`;
      
      case "denopkg.com":
        return `${blue("Denopkg.com")} ${bold(`${owner}/${name}`)} ${italic(version)} ${
          gray(italic(relativePath))
        }`;
      
      default:
        return dep;
    }
  } catch {
    return dep;
  }
}

console.log(prettyTree(toURL("./init.ts"), deps, "", true));
