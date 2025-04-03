import * as http from "http";
import express from "express";
import { Logger } from "winston";
import { toExpressHandler } from "@pagopa/ts-commons/lib/express";
import * as bodyParser from "body-parser";
import * as nodemailer from "nodemailer";
import { Transporter } from "nodemailer";
import registerHelpers from "handlebars-helpers";
import { SendRawEmailCommand, SES } from "@aws-sdk/client-ses";
import { IConfig } from "./util/config";
import * as EmailsControllers from "./controllers/EmailsControllers";
import { infoController } from "./controllers/InfoControllers";
import { healthController } from "./controllers/HealthControllers";
import { addRetryQueueListener } from "./queues/RetryQueueListener";

/**
 * Define and start an express Server
 * to expose RESTful and SOAP endpoints for BackendApp and Proxy requests.
 *
 * @param {Configuration} config - The server configuration to use
 * @return {Promise<http.Server>} The express server defined and started
 */
export const startApp = async (
  config: IConfig,
  logger: Logger
): Promise<http.Server> => {
  logger.info(
    `⚡️⚡️⚡️⚡️⚡️ pagopa-notification-service server Starting at https://localhost:${config.PORT} ⚡️⚡️⚡️⚡️⚡️`
  );

  logger.info(
    `⚡️⚡️⚡️⚡️⚡️ pagopa-notification-service server setup AWS mail mailTrasporter ⚡️⚡️⚡️⚡️⚡️`
  );

  const SES_CONFIG = {
    credentials: {
      accessKeyId: config.AWS_SES_ACCESS_KEY_ID,
      secretAccessKey: config.AWS_SES_SECRET_ACCESS_KEY
    },
    region: config.AWS_SES_REGION,
    endpoint: "http://aws-ses-mock.ecommerce.svc.cluster.local:8005"
  };

  const mailTrasporter: Transporter = nodemailer.createTransport({
    SES: {
      aws: { SendRawEmailCommand },
      ses: new SES(SES_CONFIG)
    }
  });

  registerHelpers();

  logger.info(
    `⚡️⚡️⚡️⚡️⚡️ pagopa-notification-service server setup express app ⚡️⚡️⚡️⚡️⚡️`
  );

  const app: express.Express = express();
  app.set("port", config.PORT);

  const jsonParser = bodyParser.json();

  const sendMailtHandler = toExpressHandler(
    EmailsControllers.sendMail(config, mailTrasporter)
  );
  const getInfoHandler = toExpressHandler(infoController(config, logger));

  const getHealthHandler = toExpressHandler(healthController(config, logger));

  app.post("/emails", jsonParser, sendMailtHandler);
  app.get("/health/readiness", jsonParser, getInfoHandler);
  app.get("/health/liveness", jsonParser, getHealthHandler);

  app.get("/", (req: express.Request, res: express.Response) => {
    res.send("Express + TypeScript Server");
  });
  const server = http.createServer(
    { keepAliveTimeout: config.SERVER_KEEP_ALIVE },
    app
  );
  server.listen(config.PORT);

  addRetryQueueListener(config, mailTrasporter);

  logger.info(
    `⚡️⚡️⚡️⚡️⚡️ pagopa-notification-service Server started at https://localhost:${config.PORT} ⚡️⚡️⚡️⚡️⚡️`
  );
  return server;
};
