import { logger } from "./util/logger";
logger.info(
  `⚡️⚡️⚡️⚡️⚡️ Start agent ELK ⚡️⚡️⚡️⚡️⚡️`
);

const apm = require('elastic-apm-node').start()

/**
 * Create and Run the server
 */
import * as app from "./app";
import { getConfigOrThrow } from "./util/config";

// Retrieve server configuration
const config = getConfigOrThrow();

// Define and start server
app.startApp(config, logger).catch(error => {
  logger.error(`Error occurred starting server: ${error}`);
});
