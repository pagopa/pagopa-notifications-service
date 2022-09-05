import { QueueClient } from "@azure/storage-queue";
import { getConfigOrThrow } from "./config";

const config = getConfigOrThrow();

export const retryQueueClient = new QueueClient(
  config.STORAGE_CONNECTION_STRING,
  config.RETRY_QUEUE_NAME
);

export const errorQueueClient = new QueueClient(
  config.STORAGE_CONNECTION_STRING,
  config.ERROR_QUEUE_NAME
);
