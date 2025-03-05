/**
 * Create and Run the server
 */
import * as opentelemetryInstrumentation from "./opentelemetryInstrumentation";
import * as app from "./app";
import { getConfigOrThrow } from "./util/config";
import { logger } from "./util/logger";

logger.info(`Starting OTEL SDK`);
opentelemetryInstrumentation.opentelemetrySdk.start();
logger.info(`OTEL SDK started`);

// Retrieve server configuration
const config = getConfigOrThrow();

process.on("unhandledRejection", (reason, _promise) => {
  logger.error(reason);
});

process.on("uncaughtException", reason => {
  logger.error(reason);
});

// Define and start server
app.startApp(config, logger).catch(error => {
  logger.error(`Error occurred starting server: ${error}`);
});

process.on("SIGTMER", () => {
  logger.info(`Stopping OTEL SDK`);
  opentelemetryInstrumentation.opentelemetrySdk
    .shutdown()
    .then(() => logger.info("SDK terminated"))
    .catch(error => logger.error(`Error while stopping OTEL SDK: ${error}`))
    .finally(() => process.exit(0));
});
