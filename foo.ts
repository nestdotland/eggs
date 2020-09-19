import { wait } from "https://deno.land/x/wait@0.1.7/mod.ts";
import * as color from "https://x.nest.land/std@0.69.0/fmt/colors.ts";

const spinner = wait("Generating terrain").start();

setTimeout(() => {
  spinner.color = "yellow";
  spinner.text = "Loading dinosaurs";
  spinner.prefix = color.blue("[INFO] ");
}, 1500);
setTimeout(() => {
  spinner.stop();
}, 5500);
