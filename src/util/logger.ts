import { createLogger, transports, Logform, format } from "winston";
import { ecsFormat } from "@elastic/ecs-winston-format";
import packageJson from "../../package.json";
import { requestContext } from "./contextStorage";

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

const hooks: ReadonlyArray<Logform.Format> = [
  format(info => ({
    ...info,
    ...(requestContext.getStore() ?? {})
  }))(),
  ecsFormat({
    serviceEnvironment: attributes["deployment.environment"] ?? "unset",
    serviceName: attributes["service.name"] ?? "unset",
    serviceVersion: appVersion
  })
];

export const logger = createLogger({
  format: format.combine(...hooks),
  transports: [
    new transports.Console({ handleExceptions: true, handleRejections: true })
  ]
});
