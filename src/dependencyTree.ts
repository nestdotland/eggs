import { fromFileUrl, resolve, tree } from "../deps.ts";

const decoder = new TextDecoder("utf-8");

export function fileURL(path: string, url: string = "") {
  if (url.match(/file:\/\/\//))  {
    return new URL(path, url).href
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

export function toURL(path: string, url: string = "") {
  if (path.match(/https?:\/\//)) {
    return path;
  } 
  if (url.match(/https?:\/\//)) {
    return new URL(path, url).href
  }
  return fileURL(path, url);
}

async function fetchData(url: string) {
  if (url.match(/https?:\/\//)) {
    const data = await fetch(url);
    return data.text();
  }
  const data = await Deno.readFile(resolve(fromFileUrl(url)));
  return decoder.decode(data);
}

export type DependencyTree = Map<string, DependencyTree>;

let j = 0;

const markedDependencies = new Set<string>()

export async function dependencyTree(url: string): Promise<DependencyTree> {
  if (url === "") return new Map();
  const src = await fetchData(url);

  const dependencies: string[] = tree("", src).map((dep: string) =>
    toURL(dep, url)
  );

  markedDependencies.add(url)

  const resolvedDependencies = dependencies
    .map((dep) => markedDependencies.has(dep) ? "" : dep)
    .map((dep) => dependencyTree(dep));
  const settledDependencies = await Promise.allSettled(resolvedDependencies);

  const depTree: DependencyTree = new Map<string, DependencyTree>();

  for (let i = 0; i < dependencies.length; i++) {
    console.log(j++);
    const dep = settledDependencies[i];

    if (dep.status === "fulfilled") {
      depTree.set(dependencies[i], dep.value);
    } else {
      depTree.set(dependencies[i], new Map());
    }
  }

  return depTree;
}
