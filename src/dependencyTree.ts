import { fromFileUrl, isAbsolute, resolve, tree } from "../deps.ts";

const decoder = new TextDecoder("utf-8");

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

export type DependencyTree = Array<{
  path: string;
  imports: DependencyTree;
}>;

export async function dependencyTree(url: string): Promise<DependencyTree> {
  const markedDependencies = new Set<string>();

  async function dependencyTree_(url: string): Promise<DependencyTree> {
    if (url === "") return [];

    markedDependencies.add(url);

    const src = await fetchData(url);

    const dependencies: string[] = tree("", src).map((dep: string) =>
      resolveURL(dep, url)
    );

    const resolvedDependencies = dependencies
      .map((dep) => markedDependencies.has(dep) ? "" : dep)
      .map((dep) => dependencyTree_(dep));
    const settledDependencies = await Promise.allSettled(resolvedDependencies);

    const depTree: DependencyTree = [];

    for (let i = 0; i < dependencies.length; i++) {
      const subDepTree = settledDependencies[i];

      if (subDepTree.status === "fulfilled") {
        depTree.push({
          path: dependencies[i],
          imports: subDepTree.value,
        });
      } else {
        depTree.push({
          path: dependencies[i],
          imports: [{
            path: "",
            imports: [],
          }],
        });
      }
    }

    return depTree;
  }

  const dependencies = await dependencyTree_(url);
  return dependencies;
}
