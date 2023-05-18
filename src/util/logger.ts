import { createLogger, transports } from "winston";

import ecsFormat = require("@elastic/ecs-winston-format");
export const logger = createLogger({
  format: ecsFormat(),
  transports: [
    new transports.Console({ handleExceptions: true, handleRejections: true }),
    new transports.File({
      filename: "/var/log/containers/logs.log"
    })
  ]
});
