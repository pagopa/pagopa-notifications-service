import * as EmailsController from "../EmailsControllers";
import { Logger } from "winston";
import * as configuration from "../../util/config";
import { Browser } from "puppeteer";
import { Envelope } from "nodemailer/lib/mime-node";
import * as SESTransport from "nodemailer/lib/ses-transport";
import { Transporter } from "nodemailer";
import * as nodemailer from "nodemailer";
import * as AWS from "aws-sdk";


describe("sendMail", () => {
  var logger: Logger;

  var config = {
    AI_ENABLED: false,
    AI_INSTRUMENTATION_KEY: "key",
    AI_SAMPLING_PERCENTAGE: 0,
    AWS_SES_ACCESS_KEY_ID: "aws_access_key",
    AWS_SES_REGION: "aws_region",
    AWS_SES_SECRET_ACCESS_KEY: "aws_secret",
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

  const sentMessage = {
    /** an envelope object {from:‘address’, to:[‘address’]} */
    envelope: {from: "testFrom", to: ["testTo"]} as Envelope,
    /** the Message-ID header value. This value is derived from the response of SES API, so it differs from the Message-ID values used in logging. */
    messageId: "messageId",
    response: "response",
    accepted: ["acceptedMail"],
    rejected: ["rejectedMail"],
    pending: ["pendingMail"]
} as SESTransport.SentMessageInfo 

const SES_CONFIG = {
  accessKeyId: config.AWS_SES_ACCESS_KEY_ID,
  region: config.AWS_SES_REGION,
  secretAccessKey: config.AWS_SES_SECRET_ACCESS_KEY
};

const mailTrasporter: Transporter = nodemailer.createTransport({
  SES: new AWS.SES(SES_CONFIG)
});

var browser: Browser;

    it("should return a correct  object", () => {
      const errorOrNodoVerificaRPTInput = EmailsController.sendMail(config, mailTrasporter, browser);
    });
});