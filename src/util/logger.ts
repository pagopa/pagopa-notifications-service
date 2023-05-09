import { createLogger, transports } from "winston";

const ecsFormat = require('@elastic/ecs-winston-format')
export const logger = createLogger({
  format: ecsFormat(),
  transports: [
    new transports.Console({ handleExceptions: true, handleRejections: true })
  ]
});
