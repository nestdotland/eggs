import {
  fromFileUrl,
  isAbsolute,
  resolve,
} from "https://x.nest.land/std@0.61.0/path/mod.ts";
import { tree as extractDependencies } from "https://x.nest.land/analyzer@0.0.1/deno.ts";

const decoder = new TextDecoder("utf-8");

export type DependencyTree = Array<{
  path: string;
  imports: DependencyTree;
}>;

export interface IDependencyTree {
  tree: DependencyTree;
  circular: boolean;
  errors: Array<[string, any]>;
  count: number;
  iterator: IterableIterator<string>;
}

export interface TreeOptions {
  fullTree: boolean;
}

/** Build a dependency tree from a relative path or remote HTTP URL.
 * Analyses simultaneously the constructed tree. */
export async function dependencyTree(
  path: string,
  options: TreeOptions = { fullTree: false },
): Promise<IDependencyTree> {
  const markedDependencies = new Map<string, DependencyTree>();

  const { fullTree } = options;

  const errors: Array<[string, any]> = [];
  let circular = false;
  let count = 0;

  async function createTree(
    url: string,
    parents: string[] = [],
  ): Promise<DependencyTree> {
    if (url.match(/^\[(Circular|Error|Redundant)/)) {
      return [{
        path: url,
        imports: [],
      }];
    }

    const depTree: DependencyTree = [];
    markedDependencies.set(url, depTree);

    const src = await fetchData(url);

    const dependencies: string[] = extractDependencies("", src)
      .map((dep: string) => resolveURL(dep, url));

    const resolvedDependencies = dependencies
      .map((dep) => {
        if (parents.includes(dep)) {
          circular = true;
          return "[Circular]";
        }
        return dep;
      })
      .map((dep) => {
        if (markedDependencies.has(dep)) {
          return fullTree
            ? Promise.resolve(markedDependencies.get(dep) as DependencyTree)
            : createTree("[Redundant]");
        }
        count++;
        return createTree(dep, [url, ...parents]);
      });
    const settledDependencies = await Promise.allSettled(
      resolvedDependencies,
    );

    for (let i = 0; i < dependencies.length; i++) {
      const subTree = settledDependencies[i];

      if (subTree.status === "fulfilled") {
        depTree.push({
          path: dependencies[i],
          imports: subTree.value,
        });
      } else {
        errors.push([dependencies[i], subTree.reason]);
        depTree.push({
          path: dependencies[i],
          imports: [{
            path: `[Error: ${subTree.reason}]`,
            imports: [],
          }],
        });
      }
    }

    return depTree;
  }

  const url = resolveURL(path);
  const tree = [{
    path: url,
    imports: await createTree(url),
  }];
  return { tree, circular, count, iterator: markedDependencies.keys(), errors };
}

/* Converts a path string to a file URL. */
export function fileURL(path: string, url = "") {
  if (url.match(/^file:\/\/\//) && (!isAbsolute(path))) {
    return new URL(path, url).href;
  }
  let resolvedPath = resolve(path).replace(/\\/g, "/");

  // Windows drive letter must be prefixed with a slash
  if (resolvedPath[0] !== "/") {
    resolvedPath = `/${resolvedPath}`;
  }

  return encodeURI(`file://${resolvedPath}`).replace(
    /[?#]/g,
    encodeURIComponent,
  );
}

/* Resolves any path, relative or HTTP url. */
export function resolveURL(path: string, base = "") {
  if (path.match(/^https?:\/\//)) {
    return path;
  }
  if (base.match(/^https?:\/\//)) {
    return new URL(path, base).href;
  }
  return fileURL(path, base);
}

/* Fetch data from file: or https: urls */
async function fetchData(url: string) {
  if (url.match(/^https?:\/\//)) {
    const data = await fetch(url);
    return data.text();
  }
  const data = await Deno.readFile(resolve(fromFileUrl(url)));
  return decoder.decode(data);
}
