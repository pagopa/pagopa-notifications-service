import "elastic-apm-node/start";
import cluster from "cluster";
import os from "os";
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

if (cluster.isMaster) {
  const cpus = os.cpus();
  logger.info(`Master process is running. Forking ${cpus.length} workers...`);

  // Fork workers
  cpus.forEach(() => {
    cluster.fork();
  });

  cluster.on("exit", worker => {
    logger.warn(`Worker ${worker.process.pid} died. Forking a new worker...`);
    cluster.fork();
  });
} else {
  // Define and start server
  app.startApp(config, logger).catch(error => {
    logger.error(`Error occurred starting server: ${error}`);
  });
}