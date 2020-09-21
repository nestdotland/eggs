import { desc, run, task, sh } from "https://x.nest.land/drake@1.4.1/mod.ts";
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
    `deno test -A --unstable`,
  );
});

desc("Lint source files.");
task("lint", [], async function () {
  await sh(
    `deno test -A --unstable`,
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
    `deno run -A --unstable mod.ts publish eggs --dry-run -do --version ${version}`,
  );
});

desc("Publishes eggs to the nest.land registry.");
task("publish", [], async function () {
  await sh(
    `deno run -A --unstable mod.ts publish eggs --dry-run -do --version ${version}`,
  );
});

desc("Reports the details of what would have been shipped.");
task("dry-ship", ["link", "dry-publish"]);

desc("Ship eggs to nest.land.");
task("ship", ["link", "publish"]);

task("get-version", [], function () {
  console.log(version);
});

run();
