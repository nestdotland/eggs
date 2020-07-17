import {
  base64,
  bold,
  Command,
  existsSync,
  expandGlobSync,
  green,
  log,
  relative,
  resolve,
  semver,
  walkSync,
} from "../../deps.ts";
import { ENDPOINT } from "../api/common.ts";
import { fetchModule } from "../api/fetch.ts";
import { postPieces, postPublishModule, PublishModule } from "../api/post.ts";

import { Config, ensureCompleteConfig } from "../context/config.ts";
import { gatherContext } from "../context/context.ts";
import { Ignore } from "../context/ignore.ts";

import { getAPIKey } from "../keyfile.ts";
import { version } from "../version.ts";
import { setupLog } from "../log.ts";

const nullConfig = {
  name: "",
  files: [""],
};

const nullIgnore = {
  accepts: [],
  denies: [],
};

async function getContext(): Promise<[Config, Ignore]> {
  const context = await gatherContext();
  const { config, ignore } = context;

  if (!config) {
    log.error("You don't have an egg.json file!");
    log.info("You can create one running `eggs init`.");
    return [nullConfig, nullIgnore];
  }

  if (!ensureCompleteConfig(config)) {
    if (!config.name) {
      log.error("Your module configuration must provide a module name.");
    }
    return [nullConfig, nullIgnore];
  }

  if (!config.files && !ignore) {
    log.critical(
      "Your module configuration must provide files to upload in the form of a `files` field in the config or in an .eggignore file.",
    );
  }

  if (!config.description) {
    log.warning(
      "You haven't provided a description for your package, continuing without one...",
    );
  }
  if (!config.version) {
    log.warning("No version found. Generating a new version now...");
  }
  return [config, ignore];
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
        `Your readme contains old import URLs from your project using deno.land/x/${name}.`,
      );
      log.warning(
        `You can change these to https://x.nest.land/${name}@VERSION`,
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
    log.error("`deno fmt` returned a non-zero code.");
  }
}

function matchFiles(config: Config, ignore: Ignore): File[] {
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
    if (ignore.denies.some((rgx) => rgx.test(file.path.substr(1)))) {
      return ignore.accepts.some((rgx) => rgx.test(file.path.substr(1)));
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

function checkEntry(config: Config, matched: File[]) {
  if (config.entry) {
    config.entry = config.entry?.replace(/^[.]/, "").replace(
      /^[^/]/,
      (s: string) => `/${s}`,
    );
  }
  if (!matched.find((e) => e.path === config.entry || "/mod.ts")) {
    log.error(
      `No ${config.entry || "/mod.ts"} found. This file is required.`,
    );
    return true;
  }
}

async function publishCommand(options: Options) {
  await setupLog(options.debug);

  let apiKey = await getAPIKey();
  if (!apiKey) {
    log.error(
      "No API Key file found. You can add one using `eggs link <api key>. You can create one on https://nest.land",
    );
    return;
  }

  const [egg, ignore] = await getContext();

  if (egg === nullConfig) return;

  log.debug("Config: ", egg);

  await checkREADME(egg);
  await checkFmt(egg);

  const matched = matchFiles(egg, ignore);
  const matchedContent = readFiles(matched);

  const noEntryFile = checkEntry(egg, matched);
  if (noEntryFile) return;

  const existing = await fetchModule(egg.name);

  const nv = `${egg.name}@${egg.version}`;

  if (existing && existing.packageUploadNames.indexOf(nv) !== -1) {
    log.error(
      "This version was already published. Please increment the version in your configuration.",
    );
    return;
  }

  let latest = "0.0.0";
  if (existing) {
    latest = existing.getLatestVersion();
  }

  egg.version = egg.version || semver.inc(latest, "patch") as string;

  const isLatest = semver.compare(egg.version, latest) === 1;

  const module: PublishModule = {
    name: egg.name,
    description: egg.description,
    repository: egg.repository,
    version: egg.version,
    unlisted: egg.unlisted,
    upload: true,
    latest: isLatest,
  };

  log.debug("Module: ", module);

  if (options.dry) {
    log.info("This was a dry run, the resulting module is:");
    console.error(module);
    log.info("The matched file were:");
    matched.forEach((file) => {
      console.log(` - ${file.path}`);
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

  log.info(`Successfully published ${bold(egg.name)}!`);

  log.info("Files uploaded: ");
  Object.entries(pieceResponse.files).forEach((el) => {
    log.info(` - ${el[0]} -> ${bold(`${ENDPOINT}/${egg.name}${el[0]}`)}`);
  });

  console.log();
  log.info(
    green(
      "You can now find your package on our registry at " +
        bold(`https://nest.land/package/${egg.name}\n`),
    ),
  );
  log.info(
    `Add this badge to your README to let everyone know:\n\n [![nest badge](https://nest.land/badge.svg)](https://nest.land/package/${egg.name})`,
  );
}

export const publish = new Command<Options, Arguments>()
  .description("Publishes the current directory to the nest.land registry.")
  .version(version)
  .option("-d, --dry", "Do a dry run")
  .action(publishCommand);

type Options = {
  debug: boolean;
  dry: boolean;
};
type Arguments = [];

interface File {
  fullPath: string;
  path: string;
  lstat: Deno.FileInfo;
}
