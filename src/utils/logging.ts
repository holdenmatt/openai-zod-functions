interface Logger {
  info: (...args: any[]) => void;
  log: (...args: any[]) => void;
  error: (...args: any[]) => void;
}

/**
 * The default logger implementation logs to the browser console in development and otherwise ignores.
 */
const defaultLogger: Logger = {
  info: process.env.NODE_ENV === "development" ? console.info : () => {},
  log: process.env.NODE_ENV === "development" ? console.log : () => {},
  error: console.error,
};

let currentLogger: Logger = defaultLogger;

/**
 * You can optionally override the logger (e.g. to send messages to a logging service).
 */
export const setLogger = (logger: Logger) => {
  currentLogger = logger;
};

// Exported logger functions use the current logger.
export const logger = {
  info: (...args: any[]) => currentLogger.info(...args),
  log: (...args: any[]) => currentLogger.log(...args),
  error: (...args: any[]) => currentLogger.error(...args),
};
