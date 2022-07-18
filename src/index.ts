/**
 * Create and Run the server
 */
import * as app from "./app";
import { getConfigOrThrow } from "./util/config";
import { logger } from "./util/Logger";

// Retrieve server configuration
const config = getConfigOrThrow();

// Define and start server
app.startApp(config, logger).catch(error => {
  logger.error(`Error occurred starting server: ${error}`);
});
