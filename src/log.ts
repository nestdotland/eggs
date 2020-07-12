// Copyright 2020-present the denosaurs team. All rights reserved. MIT license.

import {
  BaseHandler,
  blue,
  bold,
  green,
  log,
  LogLevels,
  LogRecord,
  red,
  reset,
  yellow,
} from "../deps.ts";

const DEBUG_LEVEL = "DEBUG";
const QUIET_LEVEL = "ERROR";
const DEFAULT_LEVEL = "INFO";

const DEFAULT_HANDLER = "format_fn";

export class ConsoleHandler extends BaseHandler {
  format(record: LogRecord): string {
    let msg = "";
    switch (record.level) {
      case LogLevels.DEBUG:
        msg += green("[DBG ]");
        break;
      case LogLevels.INFO:
        msg += blue("[INFO]");
        break;
      case LogLevels.WARNING:
        msg += yellow("[WARN]");
        break;
      case LogLevels.ERROR:
        msg += red("[ERR ]");
        break;
      case LogLevels.CRITICAL:
        msg += bold(red("[CRIT]"));
        break;
      default:
        break;
    }

    msg += ` ${reset(record.msg)}`;

    for (const arg of record.args) {
      if (arg instanceof Object) {
        msg += ` ${JSON.stringify(arg)}`;
      } else {
        msg += ` ${String(arg)}`;
      }
    }

    return msg;
  }

  log(msg: string): void {
    console.log(msg);
  }
}

export async function setupLog(): Promise<void> {
  const level = DEBUG_LEVEL; // TODO(@qu4k): make it an flag
  await log.setup({
    handlers: {
      [DEFAULT_HANDLER]: new ConsoleHandler(level),
    },
    loggers: {
      default: {
        level,
        handlers: [DEFAULT_HANDLER],
      },
    },
  });
}
