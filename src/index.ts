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

if (cluster.isPrimary) {
  const cpus = os.cpus();
  logger.info(`Master process is running. Forking ${cpus.length} workers...`);

  // Fork workers
  // we use only half cpus to avoid trashing and resource contention,
  // wich can lead worst performances overhaul
  for(let i = 0; i < cpus.length / 2; i++){
    cluster.fork();
  }

  cluster.on("exit", worker => {
    logger.warn(`Worker ${worker.process.pid} died. Forking a new worker...`);

    // backoff strategy in case workers are failing due to resource contention
    setTimeout(() => {
      cluster.fork();
    }, 5000);
  });
} else {
  // Define and start server
  app.startApp(config, logger).catch(error => {
    logger.error(`Error occurred starting server: ${error}`);
  });
}
