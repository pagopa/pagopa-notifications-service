/* eslint-disable sort-keys */
import { Transporter } from "nodemailer";
import * as SESTransport from "nodemailer/lib/ses-transport";
import { Browser } from "puppeteer";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import { NotificationEmailRequest } from "@src/generated/definitions/NotificationEmailRequest";
import { decryptBody } from "../util/confidentialDataManager";
import {
  sendEmail,
  writeMessageIntoQueue
} from "../controllers/EmailsControllers";
import { logger } from "../util/logger";
import { retryQueueClient } from "../util/queues";
import { IConfig } from "../util/config";

export const addRetryQueueListener = (
  config: IConfig,
  mailTrasporter: Transporter<SESTransport.SentMessageInfo>,
  browserEngine: Browser
): void => {
  const retrieveMessage = async (): Promise<void> => {
    const messages = await retryQueueClient.receiveMessages({
      numberOfMessages: 14
    });

    if (messages?.receivedMessageItems.length > 0) {
      logger.info(
        `Retrying ${messages.receivedMessageItems.length} enqueued messages`
      );
      for (const message of messages.receivedMessageItems) {
        await retryQueueClient.deleteMessage(
          message.messageId,
          message.popReceipt
        );
        const { clientId, bodyEncrypted, retryCount } = JSON.parse(
          message.messageText
        );
        logger.info(bodyEncrypted)
        await pipe(
          decryptBody(bodyEncrypted),
          TE.bimap(
            (e) => {
              logger.error(`Error while invoke PDV while decrypt body: ${e} `);
              // Error while decrypt body with writing on retry queque with retryCount - 1
              writeMessageIntoQueue(
                bodyEncrypted,
                clientId,
                retryCount - 1,
                config
            );
            },
            // Decrypt body OK call method sendEmail
            async (bodyDecrypted) => {
              const bodyRequest = JSON.parse(
                bodyDecrypted
              ) as NotificationEmailRequest;
              const templateId = bodyRequest.templateId;
              const schema = await import(
                `../generated/templates/${templateId}/schema.js`
              );
              void sendEmail(
                {
                  "X-Client-Id": clientId,
                  body: bodyRequest
                },
                schema,
                browserEngine,
                mailTrasporter,
                config,
                retryCount - 1
              );
            }
          )
        )();
      }
    }
  };

  setInterval(retrieveMessage, 1000);
};
