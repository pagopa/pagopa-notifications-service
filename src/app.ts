import * as http from "http";
import * as express from "express";
import { Logger } from "winston";
import { toExpressHandler } from "@pagopa/ts-commons/lib/express";
import * as bodyParser from "body-parser";
import * as AWS from "aws-sdk";
import * as nodemailer from "nodemailer";
import { Transporter } from "nodemailer";
import { Browser } from "puppeteer";
import * as puppeteer from "puppeteer";
import { IConfig } from "./util/config";
import * as EmailsControllers from "./controllers/EmailsControllers";
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
    `⚡️⚡️⚡️⚡️⚡️ pagopa-notification-service server setup puppeter for pdf generator⚡️⚡️⚡️⚡️⚡️`
  );
  const browserEngine: Browser = await puppeteer.launch({
    args: ["--no-sandbox"],
    headless: true
  });

  logger.info(
    `⚡️⚡️⚡️⚡️⚡️ pagopa-notification-service server setup AWS mail mailTrasporter ⚡️⚡️⚡️⚡️⚡️`
  );
  const SES_CONFIG = {
    accessKeyId: config.AWS_SES_ACCESS_KEY_ID,
    region: config.REGION,
    secretAccessKey: config.AWS_SES_SECRET_ACCESS_KEY
  };

  const mailTrasporter: Transporter = nodemailer.createTransport({
    SES: new AWS.SES(SES_CONFIG)
  });

  logger.info(
    `⚡️⚡️⚡️⚡️⚡️ pagopa-notification-service server setup express app ⚡️⚡️⚡️⚡️⚡️`
  );
  const app: express.Express = express();
  app.set("port", config.PORT);

  const jsonParser = bodyParser.json();

  const sendMailtHandler = toExpressHandler(
    EmailsControllers.sendMail(config, logger, mailTrasporter, browserEngine)
  );
  app.post("/notifications/emails", jsonParser, sendMailtHandler);

  app.get("/", (req: express.Request, res: express.Response) => {
    res.send("Express + TypeScript Server");
  });
  const server = http.createServer(app);
  server.listen(config.PORT);

  logger.info(
    `⚡️⚡️⚡️⚡️⚡️ pagopa-notification-service Server started at https://localhost:${config.PORT} ⚡️⚡️⚡️⚡️⚡️`
  );
  return server;
};
