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
  IFlagArgument,
  IFlagOptions,
} from "../../deps.ts";
import { ENDPOINT } from "../api/common.ts";
import { fetchModule } from "../api/fetch.ts";
import { postPieces, postPublishModule, PublishModule } from "../api/post.ts";

import { Config, ensureCompleteConfig } from "../context/config.ts";
import { gatherContext } from "../context/context.ts";
import { Ignore } from "../context/ignore.ts";

import { getAPIKey } from "../keyfile.ts";
import { version } from "../version.ts";

async function getContext(): Promise<[Config, Ignore]> {
  const context = await gatherContext();
  const { config, ignore } = context;

  if (!config) {
    log.critical("You don't have an egg.json file!");
    log.info("You can create one running `eggs init`.");
    Deno.exit(1);
  }

  if (!ensureCompleteConfig(config)) {
    if (!config.name) {
      log.critical("Your module configuration must provide a module name.");
    }
    Deno.exit(1);
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
  } catch (_) {
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

interface File {
  fullPath: string;
  path: string;
  lstat: Deno.FileInfo;
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
    log.critical(
      `No ${config.entry || "/mod.ts"} found. This file is required.`,
    );
    Deno.exit(1);
  }
}

async function publishCommand({ dry }: { dry: boolean }) {
  let apiKey = await getAPIKey();
  if (!apiKey) {
    log.critical(
      "No API Key file found. You can add one using `eggs link --key <api key>. You can create one on https://nest.land",
    );
    Deno.exit(1);
  }

  const [egg, ignore] = await getContext();

  // TODO(@oganexon): change version according to --bump and --version

  await checkREADME(egg);
  await checkFmt(egg);

  const matched = matchFiles(egg, ignore);
  const matchedContent = readFiles(matched);

  checkEntry(egg, matched);

  const existing = await fetchModule(egg.name);

  const nv = `${egg.name}@${egg.version}`;

  if (existing && existing.packageUploadNames.indexOf(nv) !== -1) {
    log.critical(
      "This version was already published. Please increment the version in your configuration.",
    );
    Deno.exit(1);
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

  if (dry) {
    log.info(`This was a dry run, the resulting module is: ${module}`);
    log.info("The matched file were:");
    matched.forEach((file) => {
      console.log(` - ${file.path}`);
    });
    Deno.exit(1);
  }

  const uploadResponse = await postPublishModule(apiKey, module);
  if (!uploadResponse) {
    // TODO(@qu4k): provide better error reporting
    log.critical("Something broke when publishing... ");
    Deno.exit(1);
  }

  const pieceResponse = await postPieces(uploadResponse.token, matchedContent);

  if (!pieceResponse) {
    // TODO(@qu4k): provide better error reporting
    log.critical("Something broke when sending pieces... ");
    Deno.exit(1);
  }

  log.info(`Successfully published ${bold(egg.name)}!`);

  log.info("Files uploaded: ");
  Object.entries(pieceResponse.files).forEach((el) => {
    console.log(` - ${el[0]} -> ${bold(`${ENDPOINT}/${egg.name}${el[0]}`)}`);
  });

  console.log();
  console.log(
    green(
      "You can now find your package on our registry at " +
        bold(`https://nest.land/package/${egg.name}\n`),
    ),
  );
  console.log(
    `Add this badge to your README to let everyone know:\n\n [![nest badge](https://nest.land/badge.svg)](https://nest.land/package/${egg.name})`,
  );
}

const releaseTypes = [
  "patch",
  "minor",
  "major",
  "pre",
  "prepatch",
  "preminor",
  "premajor",
  "prerelease",
];

function releaseType(
  option: IFlagOptions,
  arg: IFlagArgument,
  value: string,
): string {
  if (!releaseTypes.includes(value)) {
    throw new Error(
      `Option --${option.name} must be a valid release type but got: ${value}.\nAccepted values are ${releaseTypes.join(", ")}.`,
    );
  }
  return value;
}

function versionType(
  option: IFlagOptions,
  arg: IFlagArgument,
  value: string,
): string {
  if (!semver.valid(value)) {
    throw new Error(
      `Option --${option.name} must be a valid version but got: ${value}.\nVersion must follow Semantic Versioning 2.0.0.`,
    );
  }
  return value;
}

export const publish = new Command()
  .description("Publishes the current directory to the nest.land registry.")
  .version(version)
  .type("release", releaseType)
  .type("version", versionType)
  .option("-d, --dry", "Do a dry run")
  .option(
    "--bump <value:release>",
    "Increment the version by the release type.",
    { conflicts: ["version"]}
  )
  .option(
    "--version <value:version>",
    "Update to the given version.",
    { conflicts: ["bump"] },
  )
  /* .option("--patch", "Bump the version up to the next patch version.", { conflicts: conflict("patch") })
  .option("--minor", "Bump the version up to the next minor version.", { conflicts: conflict("minor") })
  .option("--major", "Bump the version up to the next major version.", { conflicts: conflict("major") })
  .option("--pre", "Increment the prerelease version.", { conflicts: conflict("pre") })
  .option("--prepatch", "Bump the version up to the next patch version and down to a prerelease.", { conflicts: conflict("prepatch") })
  .option("--preminor", "Bump the version up to the next minor version and down to a prerelease.", { conflicts: conflict("preminor") })
  .option("--premajor", "Bump the version up to the next major version and down to a prerelease.", { conflicts: conflict("premajor") })
  .option("--prerelease", "Increment the prerelease version or increment the patch version from a non-prerelease version.", { conflicts: conflict("prerelease") }) */
  .action(() => {});
// .action(publishCommand);
