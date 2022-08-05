/* eslint-disable sort-keys */
/**
 * EmailsControllers
 * RESTful Controllers for emails functions
 */
import * as fs from "fs";
import * as express from "express";
import {
  ResponseErrorFromValidationErrors,
  ResponseSuccessJson
} from "@pagopa/ts-commons/lib/responses";

import { TypeofApiResponse } from "@pagopa/ts-commons/lib/requests";
import { Logger } from "winston";
import * as Handlebars from "handlebars";
import * as SESTransport from "nodemailer/lib/ses-transport";
import { Transporter } from "nodemailer";
import * as E from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import * as t from "io-ts";
import { Browser } from "puppeteer";
import { AsControllerFunction, AsControllerResponseType } from "../util/types";
import { SendNotificationEmailT } from "../generated/definitions/requestTypes";
import { IConfig } from "../util/config";
import { NotificationEmailRequest } from "../generated/definitions/NotificationEmailRequest";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const sendEmail = async (
  recipientEmail: string,
  data: string,
  mailTrasporter: Transporter<SESTransport.SentMessageInfo>,
  pdfData: Buffer,
  pdfName: string
) =>
  await mailTrasporter.sendMail({
    from: "no-reply@pagopa.gov.it",
    to: recipientEmail,
    subject: "Test pagopa-notifications-service",
    html: data,
    attachments: [
      {
        filename: pdfName,
        content: pdfData,
        contentType: "application/pdf"
      }
    ]
  });

export const sendMailController: (
  config: IConfig,
  logger: Logger,
  mailTrasporter: Transporter<SESTransport.SentMessageInfo>,
  browserEngine: Browser
) => AsControllerFunction<SendNotificationEmailT> = (
  config,
  logger,
  mailTrasporter,
  browserEngine
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
) => async params => {
  const data = {
    amount: params.body.amount,
    email: params.body.to,
    psp: params.body.pspName,
    noticeCode: "302000100000009424"
  };

  const templateId = "poc-1";
  const schema = await import(`../generated/templates/${templateId}/schema`);

  const htmlTemplate = fs
    .readFileSync(`src/templates/${templateId}/${templateId}.template.html`)
    .toString();
  const template = Handlebars.compile(htmlTemplate);

  return pipe(
    data,
    schema.default.decode as (v: unknown) => t.Validation<unknown>,
    E.map<unknown, string>((templateParams: unknown) =>
      template(templateParams)
    ),
    E.map(async markup => {
      const page = await browserEngine.newPage();
      await page.setContent(markup);

      const pdfData = await page.pdf({ printBackground: true });

      return await sendEmail(
        params.body.to,
        markup,
        mailTrasporter,
        pdfData,
        "test.pdf"
      );
    }),
    E.fold<
      t.Errors,
      Promise<SESTransport.SentMessageInfo>,
      ReturnType<AsControllerFunction<SendNotificationEmailT>>
    >(
      async err => ResponseErrorFromValidationErrors(schema.default)(err),
      async _v => ResponseSuccessJson({ outcome: "OK" })
    )
  );
};

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
export function sendMail(
  config: IConfig,
  logger: Logger,
  mailTrasporter: Transporter<SESTransport.SentMessageInfo>,
  browserEngine: Browser
): (
  req: express.Request
) => Promise<
  AsControllerResponseType<TypeofApiResponse<SendNotificationEmailT>>
> {
  const controller = sendMailController(
    config,
    logger,
    mailTrasporter,
    browserEngine
  );
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  return async req =>
    pipe(
      NotificationEmailRequest.decode(req.body),
      E.foldW(
        ResponseErrorFromValidationErrors(NotificationEmailRequest),
        notificationEmailRequest =>
          controller({ body: notificationEmailRequest })
      )
    );
}
