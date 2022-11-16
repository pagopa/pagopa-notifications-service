import { Logger } from "winston";
import * as InfoControllers from "../InfoControllers";
import * as configuration from "../../util/config";

describe("getInfo", () => {
  var logger: Logger;

  var config = {
    AI_ENABLED: false,
    AI_INSTRUMENTATION_KEY: "key",
    AI_SAMPLING_PERCENTAGE: 0,
    AWS_SES_ACCESS_KEY_ID: "aws access key",
    AWS_SES_REGION: "aws ses region",
    AWS_SES_SECRET_ACCESS_KEY: "aws secret",
    CLIENT_ECOMMERCE: {TEMPLATE_IDS: ["fake template"]} as configuration.NotificationsServiceClientConfig,
    CLIENT_ECOMMERCE_TEST: {TEMPLATE_IDS: ["fake template test"]} as configuration.NotificationsServiceClientConfig,
    CLIENT_PAYMENT_MANAGER: {TEMPLATE_IDS: ["fake template payment manager"]} as configuration.NotificationsServiceClientConfig,
    ERROR_QUEUE_NAME: "error q name",
    INITIAL_RETRY_TIMEOUT_SECONDS: 10,
    MAX_RETRY_ATTEMPTS: 3,
    PORT: 3240,
    RETRY_QUEUE_NAME: "retry q name",
    STORAGE_CONNECTION_STRING: "storageconnection"
  } as configuration.IConfig;

  it("should return a right function", () => {
      const infoController = InfoControllers.getInfo(config, logger);
    });
});