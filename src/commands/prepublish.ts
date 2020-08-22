/* async function checkFmt(config: Config) {
  if (!config.fmt) return;

  const formatProcess = Deno.run({ cmd: ["deno", "fmt"] }),
    formatStatus = await formatProcess.status();
  if (formatStatus.success) {
    log.info("Formatted your code.");
  } else {
    log.error(`${italic("deno fmt")} returned a non-zero code.`);
  }
}

await checkFmt(egg); // TODO(@oganexon): move this to `eggs prepublish`
 */