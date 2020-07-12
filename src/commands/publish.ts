import {
  base64,
  bold,
  Command,
  expandGlobSync,
  green,
  lstatSync,
  path,
<<<<<<< HEAD
  ProgressBar,
=======
>>>>>>> clean-code
  red,
  semver,
  yellow,
} from "../../deps.ts";
import { Config, ConfigFormats, parseConfig } from "../config.ts";
import { configExists, pathExists, readmeExists } from "../utilities/files.ts";
import { ENDPOINT, getAPIKey } from "../utilities/keyfile.ts";

function detectConfig(): ConfigFormats {
  if (pathExists("egg.yaml")) return "yaml";
  else if (pathExists("egg.yml")) return "yml";
  return "json";
}

function readFileBtoa(path: string): string {
  const data = Deno.readFileSync(path);
  return base64.fromUint8Array(data);
}

export const publish = new Command()
  .description("Publishes the current directory to the nest.land registry.")
  .action(async () => {
    const progress = new ProgressBar({ title: "Publishing:", total: 23 });
    let completed = 0;
    progress.render(completed++);
    if (configExists()) {
      progress.render(completed++);
      const decoder = new TextDecoder("utf-8");
      let configFormat = detectConfig();
      const content = decoder.decode(
        await Deno.readFile(`egg.${configFormat}`),
      );
<<<<<<< HEAD
      progress.render(completed++);
=======
>>>>>>> clean-code
      let egg: Config;
      try {
        egg = parseConfig(content, configFormat);
      } catch (err) {
        throw err;
      }
      progress.render(completed++);
      if (!egg.name) {
        throw new Error(red("You must provide a name for your package!"));
      }
      progress.render(completed++);
      if (!egg.description) {
        progress.console(yellow(
          "You haven't provided a description for your package, continuing without one...",
        ));
      }
      progress.render(completed++);
      if (!egg.version) {
        progress.console(
          yellow("No version found. Generating a new version now..."),
        );
      }
      progress.render(completed++);
      if (!egg.files) {
        throw new Error(
          red(
            "No files to upload found. Please see the documentation to add this.",
          ),
        );
      }
      progress.render(completed++);
      if (!readmeExists()) {
        progress.console(
          yellow("No README found at project root, continuing without one..."),
        );
      }
      progress.render(completed++);
      //testing if README has original deno.land/x urls instead of x.nest.land urls
      //if we add a README location field to the egg config, this needs to be updated
      try {
        const readmeContent = decoder.decode(
          await Deno.readFile(`README.md`),
        );
        if (
          readmeContent.toLowerCase().includes(
            `://deno.land/x/${egg.name.toLowerCase()}`,
          )
        ) {
<<<<<<< HEAD
          progress.console(
=======
          console.log(
>>>>>>> clean-code
            yellow(
              `Your readme contains old import URLs from your project using deno.land/x/${egg.name.toLowerCase()}.\nYou can change these to https://x.nest.land/${egg.name}@VERSION`,
            ),
          );
        }
      } catch (e) {
        progress.console(
          yellow("Could not open the README for url checking..."),
        );
      }
      progress.render(completed++);

      //formatting
      if (egg.fmt) {
        const formatProcess = Deno.run({ cmd: ["deno", "fmt"] }),
          formatStatus = await formatProcess.status();
        if (formatStatus.success) {
          progress.console(green("Formatted your code."));
        } else {
          throw new Error(
            red(
              `Error while formatting your code. Error code: ${formatStatus.code}`,
            ),
          );
        }
      }
      progress.render(completed++);
      let matched = [];
      for (let file of egg.files) {
        let matches = [
          ...expandGlobSync(file, {
            root: Deno.cwd(),
            extended: true,
          }),
        ]
          .map((el) => ({
            fullPath: el.path.replace(/\\/g, "/"),
            path: "/" + path.relative(Deno.cwd(), el.path).replace(/\\/g, "/"),
            lstat: lstatSync(el.path),
          }))
          .filter((el) => el.lstat.isFile);
        matched.push(...matches);
      }
      progress.render(completed++);

      if (egg.entry) {
        egg.entry = egg.entry?.replace(/^[.]/, "").replace(
          /^[^/]/,
          (s: string) => `/${s}`,
        );
      }
      progress.render(completed++);
      if (
        !matched.find((e) => e.path === egg.entry || "/mod.ts")
      ) {
        throw new Error(
          red(`No ${egg.entry || "/mod.ts"} found. This file is required.`),
        );
      }
      progress.render(completed++);
      let apiKey = await getAPIKey();
      if (!apiKey) {
        throw new Error(
          red(
            "No API Key file found. Please create one. Refer to the documentation on creating a " +
              bold("~/.nest-api-key") + " file.",
          ),
        );
      }

      progress.render(completed++);
      let existingPackage = await fetch(`${ENDPOINT}/api/package/${egg.name}`)
        .catch(() => void 0);
      let existingPackageBody: {
        name: string;
        owner: string;
        description: string;
        latestVersion?: string;
        latestStableVersion?: string;
        packageUploadNames: string[];
      } | undefined = existingPackage?.ok && await existingPackage?.json();
      progress.render(completed++);
      if (
        existingPackageBody &&
        existingPackageBody.packageUploadNames.indexOf(
            `${egg.name}@${egg.version}`,
          ) !== -1
      ) {
        throw red(
          "This version was already published. Please increment the version in egg.json.",
        );
      }
      progress.render(completed++);
      let latestServerVersion = "0.0.0";
      if (existingPackageBody) {
        latestServerVersion = (egg.stable
          ? existingPackageBody.latestStableVersion
          : existingPackageBody.latestVersion)?.split("@")[1] || "0.0.0";

        existingPackageBody.packageUploadNames.forEach((el) => {
          if (semver.compare(el.split("@")[1], latestServerVersion) === 1) {
            latestServerVersion = el.split("@")[1];
          }
        });
      }
      progress.render(completed++);
      egg.version = egg.version ||
        semver.inc(latestServerVersion, "patch") as string;

      let isLatest = semver.compare(egg.version, latestServerVersion) === 1;

      let uploadResponse = await fetch(`${ENDPOINT}/api/publish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": apiKey,
        },
        body: JSON.stringify({
          name: egg.name,
          description: egg.description,
          repository: egg.repository,
          version: egg.version,
          unlisted: egg.unlisted,
          upload: true,
          entry: egg.entry,
          latest: isLatest,
          stable: egg.stable,
        }),
      }).catch(() => {
        throw new Error(red("Something broke when publishing..."));
      });
      progress.render(completed++);
      let fileContents = matched.map((el) =>
        [el, readFileBtoa(el.fullPath)] as [typeof el, string]
      ).reduce((p, c) => {
        p[c[0].path] = c[1];
        return p;
      }, {} as { [x: string]: string });
      progress.render(completed++);
      if (!uploadResponse.ok) {
        throw new Error(
          red("Something broke when publishing... " + uploadResponse.status),
        );
      }
      progress.render(completed++);
      let uploadResponseBody: {
        token: string;
        name: string;
        version: string;
        owner: string;
      } = uploadResponse.ok && await uploadResponse.json();
      let pieceResponse = await fetch(`${ENDPOINT}/api/piece`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-UploadToken": uploadResponseBody.token,
        },
        body: JSON.stringify({
          pieces: fileContents,
          end: true,
        }),
      }).catch(() => {
        throw new Error(red("Something broke when sending pieces..."));
      });
      progress.render(completed++);
      if (!pieceResponse.ok) {
        throw new Error(
          red("Something broke when sending pieces... " + pieceResponse.status),
        );
      }
      let pieceResponseBody: { name: string; files: { [x: string]: string } } =
        await pieceResponse.json();
      progress.render(completed++);
      progress.console(
        green(`Successfully published ${bold(pieceResponseBody.name)}!`),
      );
      progress.console("\r\nFiles uploaded: ");
      Object.entries(pieceResponseBody.files).map((el) => {
        progress.console(
          `${el[0]} -> ${
            bold(`${ENDPOINT}/${pieceResponseBody.name}${el[0]}`)
          }`,
        );
      });
<<<<<<< HEAD
      progress.console(
=======
      console.log(
>>>>>>> clean-code
        green(
          "You can now find your package on our registry at " +
            bold(`https://nest.land/package/${egg.name}\n`),
        ),
      );
<<<<<<< HEAD
      progress.console(
=======
      console.log(
>>>>>>> clean-code
        `Add this badge to your README to let everyone know:\n\n [![nest badge](https://nest.land/badge.svg)](https://nest.land/package/${egg.name})`,
      );
    } else {
      throw new Error(
        red(
          "You don't have an egg.json file! Please create this in the root of your repository, or see the documentation for more help.",
        ),
      );
    }

    //add newline after progress bar
    console.log("\n");
  });
