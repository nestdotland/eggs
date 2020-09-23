import { desc, run, task, sh } from "https://x.nest.land/drake@1.4.1/mod.ts";
import * as semver from "https://deno.land/x/semver@v1.0.0/mod.ts";
import { version } from "./src/version.ts";

desc("Run tests.");
task("test", [], async function () {
  await sh(
    `deno test -A --unstable`,
  );
});

desc("Format source files.");
task("format", [], async function () {
  await sh(
    `deno fmt`,
  );
});

desc("Format source files.");
task("check-format", [], async function () {
  await sh(
    `deno fmt --check`,
  );
});

desc("Lint source files.");
task("lint", [], async function () {
  await sh(
    `deno lint --unstable`,
  );
});

desc("Links the nest.land API key.");
task("link", [], async function () {
  await sh(
    `deno run -A --unstable mod.ts link ${Deno.env.get("NESTAPIKEY") ||
      "null"} -do`,
  );
});

desc("Reports the details of what would have been published.");
task("dry-publish", [], async function () {
  await sh(
    `deno run -A --unstable mod.ts publish eggs --dry-run -do --no-check-all --check-installation --version ${
      semver.inc(version, "prerelease")
    }`,
  );
});

desc("Publishes eggs to the nest.land registry.");
task("publish", [], async function () {
  await sh(
    `deno run -A --unstable mod.ts publish eggs -do --no-check-all --check-installation --version ${version}`,
  );
});

desc("Reports the details of what would have been shipped.");
task("dry-ship", ["link", "dry-publish"]);

desc("Ship eggs to nest.land.");
task("ship", ["link", "publish"]);

task("get-version", [], function () {
  console.log(`Eggs version: ${version}`);
  console.log(`::set-env name=EGGS_VERSION::${version}`);
});

task("setup-github-actions", [], async function () {
  const process = Deno.run({
    cmd: ["deno", "install", "-A", "-n", "drake", "Drakefile.ts"],
  });
  await process.status();
  process.close();

  switch (Deno.build.os) {
    case "windows":
      console.log("::add-path::C:\\Users\\runneradmin\\.deno\\bin");
      break;
    case "linux":
      console.log("::add-path::/home/runner/.deno/bin");
      console.log("::set-env name=SHELL::/bin/bash");
      break;
    case "darwin":
      console.log("::add-path::/Users/runner/.deno/bin");
      break;
    default:
      break;
  }
});

desc("Development tools. Should ideally be run before each commit.");
task("dev", ["format", "lint", "dry-publish"]);

run();
