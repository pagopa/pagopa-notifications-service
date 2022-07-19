/* eslint-disable sort-keys */
/**
 * PaymentControllers
 * RESTful Controllers for Payments Endpoints
 */
import * as express from "express";
import { isLeft } from "fp-ts/lib/Either";
import {
  ResponseErrorFromValidationErrors,
  ResponseSuccessJson
} from "@pagopa/ts-commons/lib/responses";

import { TypeofApiResponse } from "@pagopa/ts-commons/lib/requests";
import { Logger } from "winston";
import * as Handlebars from "handlebars";
import * as SESTransport from "nodemailer/lib/ses-transport";
import { Transporter } from "nodemailer";
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
    your: params.body.templateId
  };

  const content = "<b>{{your}}</b>";
  const template = Handlebars.compile(content);

  const dataEmail = template(data);

  const page = await browserEngine.newPage();
  await page.setContent(dataEmail);

  const pdfData = await page.pdf();

  await sendEmail(
    params.body.to,
    dataEmail,
    mailTrasporter,
    pdfData,
    "test.pdf"
  );

  return ResponseSuccessJson({ outcome: "OK" });
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
  return async req => {
    // Validate input provided
    const errorOrNotificationEmailRequest = NotificationEmailRequest.decode(
      req.body
    );

    if (isLeft(errorOrNotificationEmailRequest)) {
      const error = errorOrNotificationEmailRequest.left;
      return ResponseErrorFromValidationErrors(NotificationEmailRequest)(error);
    }
    const notificationEmailRequest = errorOrNotificationEmailRequest.right;
    return controller({ body: notificationEmailRequest });
  };
}
