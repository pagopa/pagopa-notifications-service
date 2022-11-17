import * as EmailsController from "../EmailsControllers";
process.env = {
  PORT: "3030",
  CLIENT_ECOMMERCE_TEST: "{\"TEMPLATE_IDS\":[\"poc-1\"]}",
  STORAGE_CONNECTION_STRING: "AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;DefaultEndpointsProtocol=http;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;QueueEndpoint=http://127.0.0.1:10001/devstoreaccount1;TableEndpoint=http://127.0.0.1:10002/devstoreaccount1;",
  RETRY_QUEUE_NAME:"retry-queue",
  ERROR_QUEUE_NAME:"error-queue",
  INITIAL_RETRY_TIMEOUT_SECONDS:"120",
  MAX_RETRY_ATTEMPTS:"3",
  AI_INSTRUMENTATION_KEY:"test",
  AI_SAMPLING_PERCENTAGE:"30",
  AI_ENABLED:"false",
  AWS_SES_ACCESS_KEY_ID:"test-access-key",
  AWS_SES_REGION:"test-region",
  AWS_SES_SECRET_ACCESS_KEY:"test-secret-key"
};
import { Logger } from "winston";
import * as configuration from "../../util/config";
import { Browser } from "puppeteer";
import { Envelope } from "nodemailer/lib/mime-node";
import * as SESTransport from "nodemailer/lib/ses-transport";
import { Transporter } from "nodemailer";
import * as nodemailer from "nodemailer";
import * as AWS from "aws-sdk";
import { Context } from "aws-sdk/clients/autoscaling";
import { ParamsDictionary } from "express-serve-static-core";
import { ParsedQs } from "qs";

import * as express from "express";

describe("sendMail", () => {

afterEach(() => {
  jest.resetAllMocks();
  jest.restoreAllMocks();
});


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
  accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID,
  region: process.env.AWS_SES_REGION,
  secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY
};

const mailTrasporter: Transporter = nodemailer.createTransport({
  SES: new AWS.SES(SES_CONFIG)
});

var browser: Browser;

    it("should return a correct  object", async () => {
      //const errorOrNodoVerificaRPTInput = EmailsController.sendMail(config, mailTrasporter, browser);
      //const req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>> = {};

      var req = {
        body: "testBody"
      } as any;

      const handler = EmailsController.sendMail(config, mailTrasporter, browser);

      const responseErrorValidation = await handler(req);

      expect(responseErrorValidation.kind).toBe("IResponseErrorValidation");

      var req2 = 
         {
          header: (s: string) => "test",
          body: {
           to: "to@email.it",
           subject: "subjectTest",
           templateId: "templateIdTest",
           parameters: {}},
           lang: {language: "IT" }
         } as any;

      const responseErrorValidation2 = await handler(req2);

      expect(responseErrorValidation2.kind).toBe("IResponseErrorValidation");
      //expect(responseErrorValidation2.detail).toBe("IResponseErrorValidation");
    });
});