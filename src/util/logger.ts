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
  handleExceptions: true,
  handleRejections: true,
  transports: [new transports.Console()]
});
