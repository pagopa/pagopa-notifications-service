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
  const numCPUs = os.cpus().length;
  logger.info(`Master process is running. Forking ${numCPUs} workers...`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    logger.warn(`Worker ${worker.process.pid} died. Forking a new worker...`);
    cluster.fork();
  });
} else {
  // Define and start server
  app.startApp(config, logger).catch(error => {
    logger.error(`Error occurred starting server: ${error}`);
  });
}