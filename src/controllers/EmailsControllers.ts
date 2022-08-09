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

import {
  TypeofApiParams,
  TypeofApiResponse
} from "@pagopa/ts-commons/lib/requests";
import { Logger } from "winston";
import * as Handlebars from "handlebars";
import * as SESTransport from "nodemailer/lib/ses-transport";
import { Transporter } from "nodemailer";
import * as A from "fp-ts/lib/Array";
import * as O from "fp-ts/lib/Option";
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
  htmlData: string,
  textData: string,
  mailTrasporter: Transporter<SESTransport.SentMessageInfo>,
  pdfData: O.Option<Promise<Buffer>>,
  pdfName: string
  // eslint-disable-next-line max-params
) => {
  const attachments = await Promise.all(
    pipe(
      pdfData,
      O.map(async content => ({
        filename: pdfName,
        content: await content,
        contentType: "application/pdf"
      })),
      A.fromOption
    )
  );

  return await mailTrasporter.sendMail({
    from: "no-reply@pagopa.gov.it",
    to: recipientEmail,
    subject: "Test pagopa-notifications-service",
    html: htmlData,
    text: textData,
    attachments
  });
};

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
  const templateId = params.body.templateId;
  const schema = await import(`../generated/templates/${templateId}/schema`);

  const textTemplateRaw = fs
    .readFileSync(`src/templates/${templateId}/${templateId}.template.txt`)
    .toString();
  const textTemplate = Handlebars.compile(textTemplateRaw);

  const htmlTemplateRaw = fs
    .readFileSync(`src/templates/${templateId}/${templateId}.template.html`)
    .toString();
  const htmlTemplate = Handlebars.compile(htmlTemplateRaw);

  const pathExists = O.fromPredicate((path: string) => fs.existsSync(path));

  const pdfTemplate = pipe(
    pathExists(`src/templates/${templateId}/${templateId}.template.pdf`),
    O.map(path => fs.readFileSync(path).toString()),
    O.map(Handlebars.compile)
  );

  return pipe(
    params.body.parameters,
    schema.default.decode as (v: unknown) => t.Validation<unknown>,
    E.map<unknown, readonly [string, string, O.Option<string>]>(
      (templateParams: unknown) => [
        htmlTemplate(templateParams),
        textTemplate(templateParams),
        pipe(
          pdfTemplate,
          O.map(pdf => pdf(templateParams))
        )
      ]
    ),
    E.map(async ([htmlMarkup, textMarkup, pdfMarkup]) => {
      const pdfData = pipe(
        pdfMarkup,
        O.map(async markup => {
          const page = await browserEngine.newPage();
          await page.setContent(markup);

          return await page.pdf({ printBackground: true });
        }),
        O.map(async v => await v)
      );

      return await sendEmail(
        params.body.to,
        htmlMarkup,
        textMarkup,
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
