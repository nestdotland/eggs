import { desc, run, sh, task } from "https://x.nest.land/drake@1.4.4/mod.ts";
import { version } from "./src/version.ts";

const encoder = new TextEncoder();

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
    `deno run -A --unstable eggs.ts link ${Deno.env.get("NESTAPIKEY") ||
      "null"} -do`,
  );
});

desc("Reports the details of what would have been published.");
task("dry-publish", [], async function () {
  await sh(
    `deno run -A --unstable eggs.ts publish eggs -doY --no-check --check-installation --entry eggs.ts --version ${version}-dev --dry-run `,
  );
});

desc("Publishes eggs to the nest.land registry.");
task("publish", [], async function () {
  await sh(
    `deno run -A --unstable eggs.ts publish eggs -doY --no-check --check-installation --entry eggs.ts --version ${version}`,
  );
});

desc("Reports the details of what would have been shipped.");
task("dry-ship", ["link", "dry-publish"]);

desc("Ship eggs to nest.land.");
task("ship", ["link", "publish"]);

task("get-version", [], async function () {
  console.log(`Eggs version: ${version}`);
  const env = encoder.encode(`\nEGGS_VERSION=${version}\n`);
  const GITHUB_ENV = Deno.env.get("GITHUB_ENV");
  if (!GITHUB_ENV) throw new Error("Unable to get Github env");
  await Deno.writeFile(GITHUB_ENV, env, { append: true });
});

task("setup-github-actions", [], async function () {
  const process = Deno.run({
    cmd: ["deno", "install", "-A", "-n", "drake", "Drakefile.ts"],
  });
  await process.status();
  process.close();
});

desc("Development tools. Should ideally be run before each commit.");
task("dev", ["format", "lint", "test", "dry-publish"]);

run();
