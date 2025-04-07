/* eslint-disable sort-keys */
/**
 * EmailsControllers
 * RESTful Controllers for emails functions
 */
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
import * as SESTransport from "nodemailer/lib/ses-transport";
import { Transporter } from "nodemailer";
import * as O from "fp-ts/lib/Option";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import * as t from "io-ts";
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
import { createTemplateCache, ITemplateCache } from "../util/templateCache";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const sendEmailWithAWS = async (
  senderEmail: string,
  recipientEmail: string,
  subject: string,
  htmlData: string,
  textData: string,
  mailTrasporter: Transporter<SESTransport.SentMessageInfo>
  // eslint-disable-next-line max-params
) => {
  const messageInfoOk: SESTransport.SentMessageInfo = await mailTrasporter.sendMail(
    {
      from: senderEmail,
      to: recipientEmail,
      subject,
      html: htmlData,
      text: textData
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

export const writeMessageIntoQueue: (
  bodyEncrypted: string,
  clientId: string,
  retryCount: number,
  config: IConfig
) => void = (bodyEncrypted, clientId, retryCount, config) => {
  if (retryCount > 0) {
    logger.info(`Enqueueing failed message with retryCount ${retryCount}`);
    void retryQueueClient.sendMessage(
      JSON.stringify({
        clientId,
        bodyEncrypted,
        retryCount
      }),
      {
        visibilityTimeout:
          2 ** (config.MAX_RETRY_ATTEMPTS - retryCount) *
          config.INITIAL_RETRY_TIMEOUT_SECONDS
      }
    );
  } else {
    logger.error(`Message failed too many times, adding to error queue`);
    void sendMessageToErrorQueue(bodyEncrypted, clientId);
  }
};

// eslint-disable-next-line max-params
export const sendEmail = async (
  params: TypeofApiParams<SendNotificationEmailT>,
  schema: {
    readonly default: t.Type<unknown>;
  },
  mailTrasporter: Transporter<SESTransport.SentMessageInfo>,
  config: IConfig,
  retryCount: number,
  templateCache: ITemplateCache
  // eslint-disable-next-line max-params
): ReturnType<AsControllerFunction<SendNotificationEmailT>> => {
  const clientId = params["X-Client-Id"];

  const templateId = params.body.templateId;

  try {
    // Read templates asynchronously using the provided template cache
    const { textTemplate, htmlTemplate } = await templateCache.getTemplates(
      templateId
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
      E.map<unknown, readonly [string, string]>((templateParams: unknown) => [
        htmlTemplate(templateParams),
        textTemplate(templateParams)
      ]),
      E.map(
        async ([htmlMarkup, textMarkup]): Promise<
          O.Option<SESTransport.SentMessageInfo>
        > => {
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
                      config.ECOMMERCE_NOTIFICATIONS_SENDER,
                      params.body.to,
                      params.body.subject,
                      htmlMarkup,
                      textMarkup,
                      mailTrasporter
                    )
                  );
                } catch (error) {
                  logger.error(
                    `Error while trying to send email to AWS SES: ${error}`
                  );
                  await pipe(
                    encryptBody(JSON.stringify(params.body)),
                    TE.bimap(
                      e => {
                        logger.error(
                          "Error while invoke PDV while encrypt body"
                        );
                        // First invoking the service with aws and pdv KO returns an error.
                        if (retryCount === config.MAX_RETRY_ATTEMPTS) {
                          throw e;
                        } else {
                          // Service retry with aws and pdv ko rewrites on the queue with retry retryCount -1
                          writeMessageIntoQueue(
                            JSON.stringify(params.body),
                            clientId,
                            retryCount - 1,
                            config
                          );
                        }
                      },
                      bodyEncrypted => {
                        writeMessageIntoQueue(
                          bodyEncrypted,
                          clientId,
                          retryCount,
                          config
                        );
                      }
                    )
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
  } catch (error) {
    logger.error(`Error reading templates: ${error}`);
    return ResponseErrorValidation(
      "Template Error",
      "Failed to load templates"
    );
  }
};

export const sendMailController: (
  config: IConfig,
  mailTrasporter: Transporter<SESTransport.SentMessageInfo>,
  templateCache: ITemplateCache
) => AsControllerFunction<SendNotificationEmailT> = (
  config,
  mailTrasporter,
  templateCache
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
) => async params => {
  const templateId = params.body.templateId;

  const schema = await import(`../generated/templates/${templateId}/schema.js`);

  return sendEmail(
    params,
    schema,
    mailTrasporter,
    config,
    config.MAX_RETRY_ATTEMPTS,
    templateCache
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
  templateCacheFactory: () => ITemplateCache = createTemplateCache
): (
  req: express.Request
) => Promise<
  AsControllerResponseType<TypeofApiResponse<SendNotificationEmailT>>
> {
  // Create the template cache when the function is called
  const templateCache = templateCacheFactory();

  const controller = sendMailController(config, mailTrasporter, templateCache);
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  return async req => {
    try {
      return await pipe(
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
    } catch (error) {
      logger.error(`Unexpected error in sendMail: ${error}`);
      return ResponseErrorValidation(
        "Template Error",
        "Failed to load templates"
      );
    }
  };
}
