import {
  BaseHandler,
  blue,
  bold,
  green,
  LevelName,
  log,
  LogLevels,
  LogRecord,
  red,
  reset,
  yellow,
} from "../deps.ts";

import { version } from "./version.ts";


let masterLogRecord = "";

class ConsoleHandler extends BaseHandler {
  format(record: LogRecord): string {
    let msg = "";
    switch (record.level) {
      case LogLevels.DEBUG:
        msg += green("[DBG]");
        break;
      case LogLevels.INFO:
        msg += blue("[INFO]");
        break;
      case LogLevels.WARNING:
        msg += yellow("[WARN]");
        break;
      case LogLevels.ERROR:
        msg += red("[ERR]");
        break;
      case LogLevels.CRITICAL:
        msg += bold(red("[CRIT]"));
        break;
      default:
        break;
    }

    msg += ` ${reset(record.msg)}`;

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
      if (arg instanceof Object) {
        msg += `\n${JSON.stringify(arg)}`;
      } else {
        msg += ` ${stripANSII(String(arg))}`;
      }
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
  consoleLevel: LevelName = "INFO",
): Promise<void> {
  await log.setup({
    handlers: {
      console: new ConsoleHandler(consoleLevel),
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
    "./eggs-error.log",
    encoder.encode(
      args +
        denoVersion +
        eggsVersion +
        platform +
        masterLogRecord,
    ),
  );
}

const colorRegex = /\x1B[[(?);]{0,2}(;?\d)*./g;

export function stripANSII(msg: string) {
  return msg.replace(colorRegex, "");
}
