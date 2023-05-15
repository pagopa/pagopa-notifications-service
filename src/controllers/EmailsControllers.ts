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
  ResponseSuccessAccepted,
  ResponseSuccessJson
} from "@pagopa/ts-commons/lib/responses";

import {
  TypeofApiParams,
  TypeofApiResponse
} from "@pagopa/ts-commons/lib/requests";
import * as Handlebars from "handlebars";
import * as SESTransport from "nodemailer/lib/ses-transport";
import { Transporter } from "nodemailer";
import * as O from "fp-ts/lib/Option";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import * as t from "io-ts";
import { Browser } from "puppeteer";
import { Envelope } from "nodemailer/lib/mime-node";
import { formatValidationErrors } from "io-ts-reporters";
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
import { retryQueueClient } from "../util/queues";
import { sendMessageToErrorQueue } from "../queues/ErrorQueue";
import { encryptBody } from "../util/confidentialDataManager";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const sendEmailWithAWS = async (
  recipientEmail: string,
  subject: string,
  htmlData: string,
  textData: string,
  mailTrasporter: Transporter<SESTransport.SentMessageInfo>,
  _pdfData: O.Option<Promise<Buffer>>,
  _pdfName: string
  // eslint-disable-next-line max-params
) => {
  /*
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
  */
  const messageInfoOk: SESTransport.SentMessageInfo = await mailTrasporter.sendMail(
    {
      from: "no-reply@pagopa.it",
      to: recipientEmail,
      subject,
      html: htmlData,
      text: textData
      // attachments
    }
  );
  logger.info(`Message sent with ID ${messageInfoOk.messageId}`);

  return messageInfoOk;
};
const mockedResponse = (to: string): SESTransport.SentMessageInfo => ({
  envelope: {
    from: "no-reply@pagopa.gov.it",
    to: [to]
  } as Envelope,
  messageId: "mock-id",
  response: "ok",
  accepted: [to],
  rejected: [],
  pending: []
});

// eslint-disable-next-line max-params
export const sendEmail = async (
  params: TypeofApiParams<SendNotificationEmailT>,
  schema: {
    readonly default: t.Type<unknown>;
  },
  browserEngine: Browser,
  mailTrasporter: Transporter<SESTransport.SentMessageInfo>,
  config: IConfig,
  retryCount: number
  // eslint-disable-next-line max-params
): ReturnType<AsControllerFunction<SendNotificationEmailT>> => {
  const clientId = params["X-Client-Id"];
  const templateId = params.body.templateId;
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
  // add pagopa logo URI taken from configuration
  const enrichedParameters = {
    ...params.body.parameters,
    logos: {
      pagopaCdnUri: config.PAGOPA_MAIL_LOGO_URI
    }
  };

  return pipe(
    enrichedParameters,
    schema.default.decode,
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
    E.map(
      async ([htmlMarkup, textMarkup, pdfMarkup]): Promise<
        O.Option<SESTransport.SentMessageInfo>
      > => {
        const pdfData = pipe(
          pdfMarkup,
          O.map(async markup => {
            const page = await browserEngine.newPage();
            await page.setContent(markup);

            return await page.pdf({ printBackground: true });
          }),
          O.map(async v => await v)
        );
        logger.info(
          `[${clientId}] - Sending email with template ${templateId}`
        );
        return pipe(
          clientId,
          O.fromPredicate(
            (client: string) => client !== "CLIENT_ECOMMERCE_TEST"
          ),
          O.fold(
            async () => O.some(mockedResponse(params.body.to)),
            async () => {
              try {
                return O.some(
                  await sendEmailWithAWS(
                    params.body.to,
                    params.body.subject,
                    htmlMarkup,
                    textMarkup,
                    mailTrasporter,
                    pdfData,
                    "test.pdf"
                  )
                );
              } catch (e) {
                logger.error(
                  `Error while trying to send email to AWS SES: ${e}`
                );
                await pipe(
                  encryptBody(JSON.stringify(params)),
                  TE.map(paramsEncrypted => {
                    if (retryCount > 0) {
                      logger.info(
                        `Enqueueing failed message with retryCount ${retryCount}`
                      );
                      void retryQueueClient.sendMessage(
                        JSON.stringify({
                          paramsEncrypted,
                          retryCount
                        }),
                        {
                          visibilityTimeout:
                            2 ** (config.MAX_RETRY_ATTEMPTS - retryCount) *
                            config.INITIAL_RETRY_TIMEOUT_SECONDS
                        }
                      );
                    } else {
                      logger.error(
                        `Message failed too many times, adding to error queue`
                      );
                      logger.error(JSON.stringify(params));

                      void sendMessageToErrorQueue(params);
                    }
                  })
                )();
                return O.none;
              }
            }
          )
        );
      }
    ),
    E.fold(
      async err => ResponseErrorFromValidationErrors(schema.default)(err),
      async sentMessageInfo =>
        pipe(
          await sentMessageInfo,
          O.fold<
            SESTransport.SentMessageInfo,
            ReturnType<AsControllerFunction<SendNotificationEmailT>>
          >(
            async () => ResponseSuccessAccepted(),
            async _v => ResponseSuccessJson({ outcome: "OK" })
          )
        )
    )
  );
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

  return sendEmail(
    params,
    schema,
    browserEngine,
    mailTrasporter,
    config,
    config.MAX_RETRY_ATTEMPTS
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
  return async req =>
    pipe(
      req.body,
      NotificationEmailRequest.decode,
      E.mapLeft(async e => {
        logger.error(formatValidationErrors(e));
        return ResponseErrorFromValidationErrors(NotificationEmailRequest)(e);
      }),
      E.bindTo("body"),
      E.bind("clientId", () =>
        pipe(
          getClientId(req),
          E.mapLeft(e => headerValidationErrorHandler(e))
        )
      ),
      E.chainFirst(({ body, clientId }) =>
        pipe(
          validTemplateIdGivenClientConfig(
            config[clientId as NotificationsServiceClientEnum],
            body.templateId
          ),
          E.mapLeft(async e => ResponseErrorValidation(e.name, e.message))
        )
      ),
      E.fold(
        e => e,
        ({ body, clientId }) =>
          controller({
            body,
            "X-Client-Id": clientId
          })
      )
    );
}
