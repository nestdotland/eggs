import {
  fromFileUrl,
  isAbsolute,
  resolve,
  tree as extractDependencies,
} from "../deps.ts";

const decoder = new TextDecoder("utf-8");

export type DependencyTree = Array<{
  path: string;
  imports: DependencyTree;
}>;

interface IDependencyTree {
  tree: DependencyTree;
  circular: boolean;
  count: number;
  iterator: IterableIterator<string>
}

interface Options {
  fullTree: boolean;
}

export async function dependencyTree(
  path: string,
  options: Options = { fullTree: false },
): Promise<IDependencyTree> {
  const markedDependencies = new Map<string, DependencyTree>();

  const { fullTree } = options;

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
    const settledDependencies = await Promise.allSettled(resolvedDependencies);

    for (let i = 0; i < dependencies.length; i++) {
      const subTree = settledDependencies[i];

      if (subTree.status === "fulfilled") {
        depTree.push({
          path: dependencies[i],
          imports: subTree.value,
        });
      } else {
        depTree.push({
          path: dependencies[i],
          imports: [{
            path: `[Error: ${subTree.reason}`,
            imports: [],
          }],
        });
      }
    }

    return depTree;
  }

  const url = resolveURL(path)
  const tree = [{
    path: url,
    imports: await createTree(url)
  }]
  return { tree, circular, count, iterator: markedDependencies.keys() };
}

export function fileURL(path: string, url: string = "") {
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

export function resolveURL(path: string, url: string = "") {
  if (path.match(/^https?:\/\//)) {
    return path;
  }
  if (url.match(/^https?:\/\//)) {
    return new URL(path, url).href;
  }
  return fileURL(path, url);
}

async function fetchData(url: string) {
  if (url.match(/^https?:\/\//)) {
    const data = await fetch(url);
    return data.text();
  }
  const data = await Deno.readFile(resolve(fromFileUrl(url)));
  return decoder.decode(data);
}

/* const tree = await dependencyTree("./tree/foo.ts", { fullTree: true });

console.log(
  Deno.inspect(tree, { depth: 100 }),
);

for (const dep of tree.iterator) {
  console.log(dep);
} */
