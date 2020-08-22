import {
  base64,
  bold,
  Command,
  existsSync,
  expandGlobSync,
  green,
  italic,
  log,
  relative,
  resolve,
  semver,
  walkSync,
} from "../../deps.ts";
import { DefaultOptions } from "../commands.ts";
import { releaseType, urlType, versionType } from "../types.ts";
import { ENDPOINT } from "../api/common.ts";
import { fetchModule } from "../api/fetch.ts";
import { postPieces, postPublishModule, PublishModule } from "../api/post.ts";

import { Config, defaultConfig, configFormat, writeConfig } from "../context/config.ts";
import { gatherContext } from "../context/context.ts";
import { Ignore, parseIgnore } from "../context/ignore.ts";

import { getAPIKey } from "../keyfile.ts";
import { version } from "../version.ts";
import { setupLog, highlight } from "../log.ts";

interface File {
  fullPath: string;
  path: string;
  lstat: Deno.FileInfo;
}

function ensureCompleteConfig(config: Partial<Config>): config is Config {
  let isConfigComplete = true;

  if (!config.name) {
    log.error("Your module configuration must provide a module name.");
    isConfigComplete = false;
  }

  if (!config.version && !config.bump) {
    log.error(
      "Your module configuration must provide a version or release type.",
    );
    isConfigComplete = false;
  }

  if (!config.files && !config.ignore) {
    log.error(
      "Your module configuration must provide files to upload in the form of a `files` field and/or `ignore` field in the config or in an .eggignore file.",
    );
    isConfigComplete = false;
  }

  if (!config.description) {
    log.warning(
      "You haven't provided a description for your module, continuing without one...",
    );
  }
  return isConfigComplete;
}

async function checkREADME(config: Config) {
  if (!existsSync("README.md")) {
    log.warning("No README found at project root, continuing without one...");
  }

  const name = config.name.toLowerCase();

  try {
    let readme = await Deno.readTextFile(`README.md`);
    readme = readme.toLowerCase();
    if (readme.includes(`://deno.land/x/${name}`)) {
      log.warning(
        `Your readme contains old import URLs from your project using ${
          highlight(`deno.land/x/${name}`)
        }.`,
      );
      log.warning(
        `You can change these to ${
          highlight("https://x.nest.land/${name}@VERSION")
        }`,
      );
    }
  } catch {
    log.warning("Could not open the README for url checking...");
  }
}

async function checkFmt(config: Config) {
  if (!config.fmt) return;

  const formatProcess = Deno.run({ cmd: ["deno", "fmt"] }),
    formatStatus = await formatProcess.status();
  if (formatStatus.success) {
    log.info("Formatted your code.");
  } else {
    log.error(`${italic("deno fmt")} returned a non-zero code.`);
  }
}

function matchFiles(config: Config): File[] {
  let matched: File[] = [];
  if (config.files) {
    for (let file of config.files) {
      let matches = [
        ...expandGlobSync(file, {
          root: Deno.cwd(),
          extended: true,
        }),
      ]
        .map((file) => ({
          fullPath: file.path.replace(/\\/g, "/"),
          path: "/" + relative(Deno.cwd(), file.path).replace(/\\/g, "/"),
          lstat: Deno.lstatSync(file.path),
        }));
      matched.push(...matches);
    }
  } else {
    for (const entry of walkSync(".")) {
      const path = "/" + entry.path;
      const fullPath = resolve(entry.path);
      const lstat = Deno.lstatSync(entry.path);
      const file: File = {
        fullPath,
        path,
        lstat,
      };
      matched.push(file);
    }
  }

  matched = matched.filter((file) => file.lstat.isFile);
  matched = matched.filter((file) => {
    if (config?.ignore?.denies.some((rgx) => rgx.test(file.path.substr(1)))) {
      return config.ignore.accepts.some((rgx) => rgx.test(file.path.substr(1)));
    }
    return true;
  });

  return matched;
}

function readFiles(matched: File[]): { [x: string]: string } {
  function readFileBtoa(path: string): string {
    const data = Deno.readFileSync(path);
    return base64.fromUint8Array(data);
  }

  return matched.map((el) =>
    [el, readFileBtoa(el.fullPath)] as [typeof el, string]
  ).reduce((p, c) => {
    p[c[0].path] = c[1];
    return p;
  }, {} as { [x: string]: string });
}

function ensureEntryFile(config: Config, matched: File[]): boolean {
  config.entry = (config.entry || "/mod.ts")
    ?.replace(/^[.]/, "")
    .replace(/^[^/]/, (s: string) => `/${s}`);

  if (!matched.find((e) => e.path === config.entry)) {
    log.error(`No ${config.entry} found. This file is required.`);
    return false;
  }
  return true;
}

function isVersionUnstable(v: string) {
  return !((semver.major(v) === 0) || semver.prerelease(v));
}

function gatherOptions(options: Options, name: string) {
  return {
    name,
    version: options.version,
    bump: options.bump,
    description: options.description,
    entry: options.entry,
    unstable: options.unstable,
    unlisted: options.unlisted,
    repository: options.repository,
    files: options.files,
    ignore: options.ignore ? parseIgnore(options.ignore.join()) : undefined,
  };
}

async function publishCommand(options: Options, name: string) {
  await setupLog(options.debug);

  let apiKey = await getAPIKey();
  if (!apiKey) {
    log.error(
      `No API Key file found. You can add one using eggs ${
        italic("link <api key>")
      }. You can create one on ${highlight("https://nest.land")}`,
    );
    return;
  }

  const egg = {
    ...await gatherContext(),
    ...gatherOptions(options, name),
  };

  log.debug("Config: ", egg);

  if (!ensureCompleteConfig(egg)) return;

  await checkREADME(egg);

  await checkFmt(egg); // TODO(@oganexon): move this to `eggs prepublish`

  const matched = matchFiles(egg);
  const matchedContent = readFiles(matched);

  if (!ensureEntryFile(egg, matched)) return;

  const existing = await fetchModule(egg.name);

  let latest = "0.0.0";
  if (existing) {
    latest = existing.getLatestVersion();
  }
  if (egg.bump) {
    if ((egg.version && semver.eq(latest, egg.version)) || !egg.version) {
      egg.version = semver.inc(latest, egg.bump) as string;
    }
  }
  if (
    existing &&
    existing.packageUploadNames.indexOf(`${egg.name}@${egg.version}`) !== -1
  ) {
    log.error(
      "This version was already published. Please increment the version in your configuration.",
    );
    return;
  }

  const isLatest = semver.compare(egg.version, latest) === 1;

  const module: PublishModule = {
    name: egg.name,
    version: egg.version,
    description: egg.description || "",
    repository: egg.repository || "",
    unlisted: egg.unlisted || false,
    stable: egg.stable || !egg.unstable || isVersionUnstable(egg.version),
    upload: true,
    latest: isLatest,
    entry: egg.entry,
  };

  log.debug("Module: ", module);

  if (options.dryRun) {
    log.info(`This was a dry run, the resulting module is:`, module);
    log.info("The matched file were:");
    matched.forEach((file) => {
      log.info(` - ${file.path}`);
    });
    return;
  }

  const uploadResponse = await postPublishModule(apiKey, module);
  if (!uploadResponse) {
    // TODO(@qu4k): provide better error reporting
    throw new Error("Something broke when publishing... ");
  }

  const pieceResponse = await postPieces(uploadResponse.token, matchedContent);

  if (!pieceResponse) {
    // TODO(@qu4k): provide better error reporting
    throw new Error("Something broke when sending pieces... ");
  }

  const configPath = defaultConfig()
  if (configPath) {
    writeConfig(egg, configFormat(configPath))
  }

  log.info(`Successfully published ${bold(egg.name)}!`);

  const files = Object.entries(pieceResponse.files).reduce(
    (previous, current) => {
      return `${previous}\n        - ${current[0]} -> ${
        bold(`${ENDPOINT}/${egg.name}@${egg.version}${current[0]}`)
      }`;
    },
    "Files uploaded: ",
  );
  log.info(files);

  console.log();
  log.info(
    green(
      "You can now find your module on our registry at " +
        highlight(`https://nest.land/package/${egg.name}\n`),
    ),
  );
  log.info(
    `Add this badge to your README to let everyone know:\n\n ${
      highlight(
        `[![nest badge](https://nest.land/badge.svg)](https://nest.land/package/${egg.name})`,
      )
    }`,
  );
}

interface Options extends DefaultOptions {
  dryRun?: boolean;
  bump?: semver.ReleaseType;
  version?: string;
  description?: string;
  entry?: string;
  unstable?: boolean;
  unlisted?: boolean;
  repository?: string;
  files?: string[];
  ignore?: string[];
}

type Arguments = [string]

export const publish = new Command<Options, Arguments>()
  .description("Publishes your module to the nest.land registry.")
  .version(version)
  .type("release", releaseType)
  .type("version", versionType)
  .type("url", urlType)
  .arguments("[name: string]")
  .option("-d, --dry-run", "No changes will actually be made, reports the details of what would have been published.")
  .option(
    "--description <value:string>",
    "A description of your module that will appear on the gallery.",
  )
  .option(
    "--bump <value:release>",
    "Increment the version by the release type.",
    { conflicts: ["version"] },
  )
  .option(
    "--version <value:version>",
    "Set the version.",
    { conflicts: ["bump"] },
  )
  .option(
    "--entry <value:string>",
    "The main file of your project.",
    { default: "mod.ts" },
  )
  .option("--unstable", "Flag this version as unstable.")
  .option("--unlisted", "Hide this module/version on the gallery.")
  .option(
    "--repository <value:url>",
    "A link to your repository.",
  )
  .option(
    "--files <values...:string>",
    "All the files that should be uploaded to nest.land. Supports file globbing.",
  )
  .option(
    "--ignore <values...:string>",
    "All the files that should be ignored when uploading to nest.land. Supports file globbing.",
  )
  .action(publishCommand);
