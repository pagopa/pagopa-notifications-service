/**
 * Create and Run the server
 */
import "elastic-apm-node/start";
import * as app from "./app";
import { getConfigOrThrow } from "./util/config";
import { logger } from "./util/logger";

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