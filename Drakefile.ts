import { desc, run, task, sh } from "https://x.nest.land/drake@1.4.1/mod.ts";
import { version } from "./src/version.ts";

desc("Minimal Drake task");
task("hello", [], function () {
  console.log("Hello World!");
});

task("release-test", [], async function () {
  await sh(
    `deno run -A --unstable mod.ts publish eggs --dry-run -do --ignore "extends .gitignore" --version ${version}`,
  );
});

run();
