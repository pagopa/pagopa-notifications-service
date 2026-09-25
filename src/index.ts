/**
 * Create and Run the server
 */
import * as app from "./app";
import { getConfigOrThrow } from "./util/config";
import { logger } from "./util/logger";

// Retrieve server configuration
const config = getConfigOrThrow();

process.on("unhandledRejection", (reason, _promise) => {
  logger.error("Unhandled Rejection", {
    error: {
      message: reason
    },
    event_outcome: "failure"
  });
});

process.on("uncaughtException", reason => {
  logger.error("Uncaught Exception", {
    error: {
      message: reason
    },
    event_outcome: "failure"
  });
});

// Define and start server
app.startApp(config, logger).catch(error => {
  logger.error("Error occurred starting server", {
    error: {
      message: error
    },
    event_outcome: "failure"
  });
});
