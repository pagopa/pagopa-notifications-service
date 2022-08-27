/* eslint-disable sort-keys */
/**
 * EmailsControllers
 * RESTful Controllers for emails functions
 */
import * as fs from "fs";
import * as express from "express";
import {
  IResponseErrorValidation,
  ResponseErrorFromValidationErrors,
  ResponseErrorValidation,
  ResponseSuccessJson
} from "@pagopa/ts-commons/lib/responses";

import { TypeofApiResponse } from "@pagopa/ts-commons/lib/requests";
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
import {
  IConfig,
  NotificationsServiceClientConfig,
  NotificationsServiceClientEnum,
  NotificationsServiceClientType
} from "../util/config";
import { logger } from "../util/logger";
import { NotificationEmailRequest } from "../generated/definitions/NotificationEmailRequest";
import { SendNotificationEmailT } from "../generated/definitions/requestTypes";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const sendEmail = async (
  recipientEmail: string,
  subject: string,
  htmlData: string,
  textData: string,
  mailTrasporter: Transporter<SESTransport.SentMessageInfo>,
  pdfData: O.Option<Promise<Buffer>>,
  pdfName: string
  // eslint-disable-next-line max-params
) => {
  logger.info("Attachment configurations...");
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

  logger.info("Sending...");
  try {
    const messageInfoOk: SESTransport.SentMessageInfo = await mailTrasporter.sendMail(
      {
        from: "no-reply@pagopa.gov.it",
        to: recipientEmail,
        subject,
        html: htmlData,
        text: textData,
        attachments
      }
    );
    logger.info(messageInfoOk.response);
    logger.info(messageInfoOk.messageId);
    // eslint-disable-next-line no-console
    console.info(messageInfoOk);
    return messageInfoOk;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.info(e);
    logger.info("Error");

    return { messageId: "" } as SESTransport.SentMessageInfo;
  }
};

export const sendMailController: (
  config: IConfig,
  mailTrasporter: Transporter<SESTransport.SentMessageInfo>,
  browserEngine: Browser
) => AsControllerFunction<SendNotificationEmailT> = (
  config,
  mailTrasporter,
  browserEngine
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
) => async params => {
  const templateId = params.body.templateId;
  const schema = await import(`../generated/templates/${templateId}/schema.js`);
  const clientId = params["X-Client-Id"];

  const textTemplateRaw = fs
    .readFileSync(
      `./dist/src/templates/${templateId}/${templateId}.template.txt`
    )
    .toString();
  const textTemplate = Handlebars.compile(textTemplateRaw);

  const htmlTemplateRaw = fs
    .readFileSync(
      `./dist/src/templates/${templateId}/${templateId}.template.html`
    )
    .toString();
  const htmlTemplate = Handlebars.compile(htmlTemplateRaw);

  const pathExists = O.fromPredicate((path: string) => fs.existsSync(path));

  const pdfTemplate = pipe(
    pathExists(
      `dist/src/templates/${templateId}/${templateId}.template.pdf.html`
    ),
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
      logger.info(`[${clientId}] - Sending email with template ${templateId}`);
      return await sendEmail(
        params.body.to,
        params.body.subject,
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

const validTemplateIdGivenClientConfig = (
  clientConfig: NotificationsServiceClientConfig,
  templateId: string
): E.Either<Error, unknown> =>
  pipe(
    templateId,
    E.right,
    E.chainFirst(
      E.fromPredicate(
        () => clientConfig.TEMPLATE_IDS.includes(templateId),
        () => new Error("Invalid Template")
      )
    )
  );

const getClientId = (req: express.Request): t.Validation<string> =>
  pipe(
    O.fromNullable(req.header("X-Client-Id")),
    E.fromOption(() => [
      {
        context: t.getDefaultContext(NotificationsServiceClientType),
        message: "Missing X-Client-Id header",
        value: undefined
      }
    ]),
    E.chain(NotificationsServiceClientType.decode)
  );

const headerValidationErrorHandler: (
  e: ReadonlyArray<t.ValidationError>
) => Promise<IResponseErrorValidation> = async e =>
  ResponseErrorValidation(
    "Invalid X-Client-Id",
    e.map(err => err.message).join("\n")
  );

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
export function sendMail(
  config: IConfig,
  mailTrasporter: Transporter<SESTransport.SentMessageInfo>,
  browserEngine: Browser
): (
  req: express.Request
) => Promise<
  AsControllerResponseType<TypeofApiResponse<SendNotificationEmailT>>
> {
  const controller = sendMailController(config, mailTrasporter, browserEngine);
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  return async req => {
    const errorOrBody = NotificationEmailRequest.decode(req.body);
    if (E.isLeft(errorOrBody)) {
      const error = errorOrBody.left;
      return ResponseErrorFromValidationErrors(NotificationEmailRequest)(error);
    }
    const body = errorOrBody.right;

    const maybeClientId = getClientId(req);
    if (E.isLeft(maybeClientId)) {
      const error = maybeClientId.left;
      return headerValidationErrorHandler(error);
    }
    const clientId = maybeClientId.right as NotificationsServiceClientEnum;

    const maybeValidTemplate = validTemplateIdGivenClientConfig(
      config[clientId],
      body.templateId
    );

    if (E.isLeft(maybeValidTemplate)) {
      const error = maybeValidTemplate.left;
      return ResponseErrorValidation(error.name, error.message);
    }

    return controller({
      body,
      "X-Client-Id": clientId
    });
  };
}
