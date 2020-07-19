import {
  BaseHandler,
  blue,
  bold,
  log,
  LogLevels,
  LogRecord,
  red,
  resolve,
  underline,
  yellow,
  gray,
} from "../deps.ts";

import { version } from "./version.ts";

const DEBUG_LOG_FILE = "./eggs-debug.log";

export let masterLogRecord = "";
export let errorOccurred = false;
let detailedLog = false;

class ConsoleHandler extends BaseHandler {
  format(record: LogRecord): string {
    let msg = "";
    switch (record.level) {
      case LogLevels.DEBUG:
        msg += gray("[DEBUG]");
        break;
      case LogLevels.INFO:
        msg += blue("[INFO]");
        break;
      case LogLevels.WARNING:
        msg += yellow("[WARN]");
        break;
      case LogLevels.ERROR:
        msg += red("[ERR]");
        errorOccurred = true;
        break;
      case LogLevels.CRITICAL:
        msg += bold(red("[CRIT]"));
        break;
      default:
        break;
    }

    msg += ` ${record.msg}`;

    console.log(detailedLog);

    if (record.level !== LogLevels.CRITICAL || detailedLog) {
      for (const arg of record.args) {
        msg += ` ${Deno.inspect(arg)}`;
      }
    }

    return msg;
  }

  log(msg: string): void {
    console.log(msg);
  }
}

class FileHandler extends BaseHandler {
  format(record: LogRecord): string {
    let msg = record.datetime.toISOString() + " ";

    switch (record.level) {
      case LogLevels.DEBUG:
        msg += "[DEBUG]   ";
        break;
      case LogLevels.INFO:
        msg += "[INFO]    ";
        break;
      case LogLevels.WARNING:
        msg += "[WARNING] ";
        break;
      case LogLevels.ERROR:
        msg += "[ERROR]   ";
        break;
      case LogLevels.CRITICAL:
        msg += "[CRITICAL]";
        break;
      default:
        break;
    }

    msg += ` ${stripANSII(record.msg)}`;

    for (const arg of record.args) {
      msg += ` ${stripANSII(Deno.inspect(arg))}`;
    }

    return msg;
  }

  log(msg: string): void {
    masterLogRecord += msg + "\n";
  }
}

/** Setup custom deno logger. Follows format:
 * `[LEVEL] <msg> <args>` */
export async function setupLog(
  debugEnabled = false,
): Promise<void> {
  detailedLog = debugEnabled;
  await log.setup({
    handlers: {
      console: new ConsoleHandler(debugEnabled ? "DEBUG" : "INFO"),
      file: new FileHandler("DEBUG"),
    },
    loggers: {
      default: {
        level: "DEBUG",
        handlers: ["console", "file"],
      },
    },
  });
}

export async function writeLogFile() {
  const encoder = new TextEncoder();

  const args = `Arguments:\n  ${Deno.args}\n\n`;
  const denoVersion =
    `Deno version:\n  deno: ${Deno.version.deno}\n  v8: ${Deno.version.v8}\n  typescript: ${Deno.version.typescript}\n\n`;
  const eggsVersion = `Eggs version:\n  ${version}\n\n`;
  const platform = `Platform:\n  ${Deno.build.target}\n\n`;

  await Deno.writeFile(
    DEBUG_LOG_FILE,
    encoder.encode(
      args +
        denoVersion +
        eggsVersion +
        platform +
        masterLogRecord,
    ),
  );
}

export async function handleError(err: Error) {
  log.critical(`An unexpected error occurred: "${err.message}"`, err.stack);
  await writeLogFile();
  log.info(
    `If you think this is a bug, please open a bug report at ${
      underline(bold("https://github.com/nestdotland/eggs/issues/new/choose"))
    } with the information provided in ${
      underline(bold(resolve(Deno.cwd(), DEBUG_LOG_FILE)))
    }`,
  );
  log.info(
    `Visit ${
      underline(bold("https://docs.nest.land/eggs/"))
    } for documentation about this command.`,
  );
}

const colorRegex = /\x1B[[(?);]{0,2}(;?\d)*./g;

export function stripANSII(msg: string) {
  return msg.replace(colorRegex, "");
}
