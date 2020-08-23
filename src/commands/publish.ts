import {
  bold,
  Command,
  existsSync,
  green,
  italic,
  log,
  semver,
} from "../../deps.ts";
import { DefaultOptions } from "../commands.ts";
import { releaseType, urlType, versionType } from "../types.ts";

import { ENDPOINT } from "../api/common.ts";
import { fetchModule } from "../api/fetch.ts";
import { postPieces, postPublishModule, PublishModule } from "../api/post.ts";

import {
  Config,
  defaultConfig,
  configFormat,
  writeConfig,
} from "../context/config.ts";
import { gatherContext } from "../context/context.ts";
import { parseIgnore } from "../context/ignore.ts";
import { MatchedFile, matchFiles, readFiles } from "../context/files.ts";

import { getAPIKey } from "../keyfile.ts";
import { version } from "../version.ts";
import { setupLog, highlight } from "../log.ts";

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

function ensureEntryFile(config: Config, matched: MatchedFile[]): boolean {
  config.entry = (config.entry || "/mod.ts")
    ?.replace(/^[.]/, "")
    .replace(/^[^/]/, (s: string) => `/${s}`);

  if (!matched.find((e) => e.path === config.entry)) {
    log.error(`No ${config.entry} found. This file is required.`);
    return false;
  }
  return true;
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

function isVersionUnstable(v: string) {
  return !((semver.major(v) === 0) || semver.prerelease(v));
}

function gatherOptions(options: Options, name?: string) {
  return {
    name,
    version: options.version
      ? versionType("version", {}, options.version)
      : undefined,
    bump: options.bump ? releaseType("bump", {}, options.bump) : undefined,
    description: options.description,
    entry: options.entry,
    unstable: options.unstable,
    unlisted: options.unlisted,
    repository: options.repository
      ? urlType("repository", {}, options.repository)
      : undefined,
    files: options.files,
    ignore: options.ignore ? parseIgnore(options.ignore.join()) : undefined,
    checkFmt: options.checkFmt,
    checkTests: options.checkTests,
    checkInstallation: options.checkInstallation,
    checkAll: options.checkAll,
  };
}

async function checkUp(options: Options): Promise<boolean> {
  if (options.checkFmt || options.checkAll) {
    const process = Deno.run(
      { cmd: ["deno", "fmt"], stderr: "null", stdout: "null" },
    );
    const status = await process.status();
    if (status.success) {
      log.info("Formatted your code.");
    } else {
      log.error(`${italic("deno fmt")} returned a non-zero code.`);
      return false;
    }
  }

  if (options.checkTests || options.checkAll) {
    const process = Deno.run(
      {
        cmd: ["deno", "test", "-A", "--unstable"],
        stderr: "null",
        stdout: "piped",
      },
    );
    const status = await process.status();
    const stdout = new TextDecoder("utf-8").decode(await process.output());
    if (status.success || stdout.match(/^No matching test modules found/)) {
      console.log("Tests passed successfully.");
    } else {
      log.error(`${italic("deno test")} returned a non-zero code.`);
    }
    return false;
  }

  if (options.checkInstallation || options.checkAll) {
  }

  return true;
}

async function publishCommand(options: Options, name?: string) {
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

  let egg: Partial<Config>;

  try {
    egg = {
      ...await gatherContext(),
      ...gatherOptions(options, name),
    };
  } catch (err) {
    log.error(err);
    return;
  }

  log.debug("Config: ", egg);

  if (!ensureCompleteConfig(egg)) return;

  await checkREADME(egg);

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

  const configPath = defaultConfig();
  if (configPath) {
    writeConfig(egg, configFormat(configPath));
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
  checkFmt?: boolean;
  checkTests?: boolean;
  checkInstallation?: boolean;
  checkAll?: boolean;
}

type Arguments = [string];

export const publish = new Command<Options, Arguments>()
  .description("Publishes your module to the nest.land registry.")
  .version(version)
  .type("release", releaseType)
  .type("version", versionType)
  .type("url", urlType)
  .arguments("[name: string]")
  .option(
    "-d, --dry-run",
    "No changes will actually be made, reports the details of what would have been published.",
  )
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
  .option("--check-fmt", "Automatically format your code before publishing")
  .option("--check-tests", `Run ${italic("deno test")}.`)
  .option(
    "--check-installation",
    "Check for missing files in the dependency tree.",
  )
  .option("--check-all", "Performs all checks", { default: true })
  .action(publishCommand);
