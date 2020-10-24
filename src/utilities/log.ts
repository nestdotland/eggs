import {
  BaseHandler,
  blue,
  bold,
  gray,
  log,
  LogLevels,
  LogRecord,
  red,
  resolve,
  Spinner,
  stripColor,
  underline,
  wait,
  yellow,
} from "../../deps.ts";

import { version } from "../version.ts";

const DEBUG_LOG_FILE = "./eggs-debug.log";

export let masterLogRecord = "";
export let errorOccurred = false;
let detailedLog = false;

const prefix = {
  debug: gray("[DEBUG]"),
  info: blue("[INFO]"),
  warning: yellow("[WARN]"),
  error: red("[ERR]"),
  critical: bold(red("[CRIT]")),
};

class ConsoleHandler extends BaseHandler {
  format(record: LogRecord): string {
    let msg = "";
    if (record.msg) {
      switch (record.level) {
        case LogLevels.DEBUG:
          msg += prefix.debug;
          break;
        case LogLevels.INFO:
          msg += prefix.info;
          break;
        case LogLevels.WARNING:
          msg += prefix.warning;
          break;
        case LogLevels.ERROR:
          msg += prefix.error;
          errorOccurred = true;
          break;
        case LogLevels.CRITICAL:
          msg += prefix.critical;
          break;
        default:
          break;
      }

      msg += ` ${record.msg}`;
    }

    if (detailedLog) {
      for (const arg of record.args) {
        msg += ` ${Deno.inspect(arg, { depth: 10, colors: true })}`;
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

    msg += ` ${stripColor(record.msg)}`;

    for (const arg of record.args) {
      msg += ` ${Deno.inspect(arg, { depth: Infinity })}`;
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

  log.info(
    `Debug file created. (${highlight(resolve(Deno.cwd(), DEBUG_LOG_FILE))})`,
  );
}

export async function handleError(err: Error) {
  log.critical(`An unexpected error occurred: "${err.message}"`, err.stack);
  await writeLogFile();
  log.info(
    `If you think this is a bug, please open a bug report at ${
      highlight("https://github.com/nestdotland/eggs/issues/new/choose")
    } with the information provided in ${
      highlight(resolve(Deno.cwd(), DEBUG_LOG_FILE))
    }`,
  );
  log.info(
    `Visit ${
      highlight("https://docs.nest.land/eggs/")
    } for documentation about this command.`,
  );
}

export function highlight(msg: string) {
  return underline(bold(msg));
}

const ci = Deno.env.get("CI");
const ciSpinner = { stop: () => {}, text: "" } as Spinner;

export class spinner {
  static info(msg: string) {
    return ci ? ciSpinner : wait({
      text: msg,
      prefix: prefix.info,
    }).start();
  }

  static warning(msg: string) {
    return ci ? ciSpinner : wait({
      text: msg,
      prefix: prefix.warning,
    }).start();
  }

  static error(msg: string) {
    return ci ? ciSpinner : wait({
      text: msg,
      prefix: prefix.error,
    }).start();
  }

  static critical(msg: string) {
    return ci ? ciSpinner : wait({
      text: msg,
      prefix: prefix.critical,
    }).start();
  }
}
