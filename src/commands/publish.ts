import {
  basename,
  bold,
  Command,
  dependencyTree,
  dirname,
  existsSync,
  join,
  green,
  italic,
  log,
  semver,
  yellow,
} from "../../deps.ts";
import type { DefaultOptions } from "../commands.ts";
import { releaseType, urlType, versionType } from "../types.ts";

import { ENDPOINT } from "../api/common.ts";
import { fetchModule } from "../api/fetch.ts";
import { postPieces, postPublishModule, PublishModule } from "../api/post.ts";

import {
  Config,
  configFormat,
  defaultConfig,
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

  return isConfigComplete;
}

function ensureFiles(config: Config, matched: MatchedFile[]): boolean {
  if (!existsSync("README.md")) {
    log.warning("No README found at project root, continuing without one...");
  }

  config.entry = (config.entry || "/mod.ts")
    ?.replace(/^[.]/, "")
    .replace(/^[^/]/, (s: string) => `/${s}`);

  if (!matched.find((e) => e.path === config.entry)) {
    log.error(`No ${config.entry} found in config. An entry file is required.`);
    return false;
  }
  return true;
}

async function deprecationWarnings(config: Config) {
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
          highlight(`https://x.nest.land/${name}@VERSION`)
        }`,
      );
    }
  } catch {
    // Do not report the user in case of error
  }

  if (typeof config.stable === "boolean") {
    log.warning(
      `${
        yellow("[Deprecated - stable]")
      } Module stability is detected automatically. If you still want to specify the stability of your module, use the ${
        bold("unstable")
      } field.`,
    );
  }
  if (typeof config.fmt === "boolean") {
    log.warning(
      `${yellow("[Deprecated - fmt]")} Use the ${bold("checkFormat")} field.`,
    );
  }
}

function isVersionUnstable(v: string) {
  return !((semver.major(v) === 0) || semver.prerelease(v));
}

function gatherOptions(
  options: Options,
  name?: string,
): Partial<Config> | undefined {
  try {
    const cfg: Partial<Config> = {};
    // TODO(@oganexon): find a more elegant way to remove undefined fields
    name && (cfg.name = name);
    options.version &&
      (cfg.version = versionType(
        { name: "version", value: options.version, label: "", type: "" },
      ));
    options.bump &&
      (cfg.bump = releaseType(
        { name: "bump", value: options.bump, label: "", type: "" },
      ));
    options.description && (cfg.description = options.description);
    options.entry && (cfg.entry = options.entry);
    options.unstable && (cfg.unstable = options.unstable);
    options.unlisted && (cfg.unstable = options.unlisted);
    options.repository &&
      (cfg.repository = urlType(
        { name: "repository", value: options.repository, label: "", type: "" },
      ));
    options.files && (cfg.files = options.files);
    options.ignore && (cfg.ignore = parseIgnore(options.ignore.join()));
    options.checkFormat && (cfg.checkFormat = options.checkFormat);
    options.checkTests && (cfg.checkTests = options.checkTests);
    options.checkInstallation &&
      (cfg.checkInstallation = options.checkInstallation);
    options.checkAll && (cfg.checkAll = options.checkAll);
    return cfg;
  } catch (err) {
    log.error(err);
    return;
  }
}

async function checkUp(
  config: Config,
  matched: MatchedFile[],
): Promise<boolean> {
  if (config.checkFormat || config.fmt || config.checkAll) {
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

  if (config.checkTests || config.checkAll) {
    const process = Deno.run(
      {
        cmd: ["deno", "test", "-A", "--unstable"],
        stderr: "null",
        stdout: "piped",
      },
    );
    const status = await process.status();
    const stdout = new TextDecoder("utf-8").decode(await process.output());
    if (status.success) {
      log.info("Tests passed successfully.");
    } else {
      if (stdout.match(/^No matching test modules found/)) {
        log.info("No matching test modules found, tests skipped.");
      } else {
        log.error(`${italic("deno test")} returned a non-zero code.`);
        return false;
      }
    }
  }

  if (config.checkInstallation || config.checkAll) {
    const tempDir = await Deno.makeTempDir();
    for (let i = 0; i < matched.length; i++) {
      const file = matched[i];
      const dir = join(tempDir, dirname(file.path));
      try {
        await Deno.mkdir(dir, { recursive: true });
      } catch (err) {
        if (!(err instanceof Deno.errors.AlreadyExists)) {
          throw err;
        }
      }
      await Deno.copyFile(file.fullPath, join(tempDir, file.path));
    }
    const entry = join(tempDir, config.entry);
    const deps = await dependencyTree(entry);
    await Deno.remove(tempDir, { recursive: true });
    if (deps.errors.length === 0) {
      log.info("No errors detected when installing the module.");
    } else {
      log.error(
        "Some files could not be resolved during the test installation. They are probably missing, you should include them.",
      );
      for (let i = 0; i < deps.errors.length; i++) {
        const [path, error] = deps.errors[i];
        const relativePath = path.split(basename(tempDir))[1] || path;
        log.error(`${bold(relativePath)} : ${error}`);
      }
      return false;
    }
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

  const gatheredContext = await gatherContext();
  const gatheredOptions = gatherOptions(options, name);
  if (!gatheredContext || !gatheredOptions) return;

  let egg: Partial<Config> = {
    ...gatheredContext,
    ...gatheredOptions,
  };

  if (!ensureCompleteConfig(egg)) return;

  const matched = matchFiles(egg);
  const matchedContent = readFiles(matched);

  if (!ensureFiles(egg, matched)) return;
  if (!await checkUp(egg, matched)) return;
  await deprecationWarnings(egg);

  log.debug("Config:", egg);
  log.debug("Matched files:", matched);

  const existing = await fetchModule(egg.name);

  let latest = "0.0.0";
  if (existing) {
    latest = existing.getLatestVersion();
    egg.description = egg.description || existing.description;
    egg.repository = egg.repository || existing.repository;
  }
  if (egg.bump) {
    egg.version = semver.inc(egg.version || latest, egg.bump) as string;
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

  if (!egg.description) {
    log.warning(
      "You haven't provided a description for your module, continuing without one...",
    );
  }

  const module: PublishModule = {
    name: egg.name,
    version: egg.version,
    description: egg.description || "",
    repository: egg.repository || "",
    unlisted: egg.unlisted || false,
    stable: egg.stable || !egg.unstable || isVersionUnstable(egg.version),
    upload: true,
    latest: semver.compare(egg.version, latest) === 1,
    entry: egg.entry,
  };

  log.debug("Module: ", module);

  if (options.dryRun) {
    log.info(`This was a dry run, the resulting module is:`, module);
    log.info("The matched files were:");
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
    await writeConfig(egg, configFormat(configPath));
    log.debug("Updated configuration.");
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
      `You can now find your module on our registry at ${
        highlight(`https://nest.land/package/${egg.name}`)
      }`,
    ),
  );
  console.log();
  log.info("Now you can showcase your module on our GitHub Discussions!");
  log.info(highlight("https://github.com/nestdotland/nest.land/discussions"));
}

interface Options extends DefaultOptions {
  dryRun?: boolean;
  bump?: semver.ReleaseType;
  version?: string;
  description?: string;
  entry: string;
  unstable?: boolean;
  unlisted?: boolean;
  repository?: string;
  files?: string[];
  ignore?: string[];
  checkFormat?: boolean;
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
  )
  .option("--version <value:version>", "Set the version.")
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
  .option("--check-format", "Automatically format your code before publishing")
  .option("--check-tests", `Run ${italic("deno test")}.`)
  .option(
    "--check-installation",
    "Simulates a dummy installation and check for missing files in the dependency tree.",
  )
  .option("--check-all", "Performs all checks.", { default: true })
  .action(publishCommand);
