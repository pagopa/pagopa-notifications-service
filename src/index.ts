/**
 * Create and Run the server
 */
import * as app from "./app";
import { getConfigOrThrow } from "./util/config";
import { getLoggableError, logger } from "./util/logger";

// Retrieve server configuration
const config = getConfigOrThrow();

process.on("unhandledRejection", (reason, _promise) => {
  logger.error("Unhandled Rejection", {
    ...getLoggableError(reason),
    event_outcome: "failure"
  });
});

process.on("uncaughtException", reason => {
  logger.error("Uncaught Exception", {
    ...getLoggableError(reason),
    event_outcome: "failure"
  });
});

// Define and start server
app.startApp(config, logger).catch(error => {
  logger.error("Error occurred starting server", {
    ...getLoggableError(error),
    event_outcome: "failure"
  });
});
