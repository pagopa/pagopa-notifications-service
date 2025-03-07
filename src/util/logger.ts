import { createLogger, transports } from "winston";

import { ecsFormat } from "@elastic/ecs-winston-format";

import packageJson from "../../package.json";
const otelResourceAttributes = process.env.OTEL_RESOURCE_ATTRIBUTES;

const appVersion = packageJson.version;

const attributes: Record<string, string> = {};
otelResourceAttributes
  ?.split(",")
  .map(el => {
    const splitted = el.split("=");
    return { key: splitted[0], value: splitted[1] };
  })
  // eslint-disable-next-line functional/immutable-data
  .forEach(el => (attributes[el.key] = el.value));

export const logger = createLogger({
  format: ecsFormat({
    serviceEnvironment: attributes["deployment.environment"],
    serviceName: attributes["service.name"],
    serviceVersion: appVersion
  }),
  transports: [
    new transports.Console({ handleExceptions: true, handleRejections: true })
  ]
});
