import * as logform from "logform";
import { createLogger, format, transports } from "winston";

const { timestamp, printf } = logform.format;

export const logger = createLogger({
  format: format.combine(
    timestamp(),
    format.splat(),
    format.simple(),
    printf(nfo => `${nfo.timestamp} [${nfo.level}]: ${nfo.message}`)
  ),
  transports: [
    new transports.Console({ handleExceptions: true, handleRejections: true })
  ]
});
