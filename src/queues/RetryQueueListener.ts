/* eslint-disable sort-keys */
import { Transporter } from "nodemailer";
import * as SESTransport from "nodemailer/lib/ses-transport";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import { decryptBody } from "../util/confidentialDataManager";
import {
  sendEmail,
  writeMessageIntoQueue
} from "../controllers/EmailsControllers";
import { logger } from "../util/logger";
import { retryQueueClient } from "../util/queues";
import { IConfig } from "../util/config";
import { NotificationEmailRequest } from "../generated/definitions/NotificationEmailRequest";

export const addRetryQueueListener = (
  config: IConfig,
  mailTrasporter: Transporter<SESTransport.SentMessageInfo>
): void => {
  const retrieveMessage = async (): Promise<void> => {
    try {
      const messages = await retryQueueClient.receiveMessages({
        numberOfMessages: 14
      });

      if (messages?.receivedMessageItems.length > 0) {
        logger.info(
          `Retrying ${messages.receivedMessageItems.length} enqueued messages`
        );
        for (const message of messages.receivedMessageItems) {
          try {
            await retryQueueClient.deleteMessage(
              message.messageId,
              message.popReceipt
            );

            const { clientId, bodyEncrypted, retryCount } = JSON.parse(
              message.messageText
            );
            logger.info(bodyEncrypted);
            await pipe(
              decryptBody(bodyEncrypted),
              TE.bimap(
                e => {
                  logger.error(
                    `Error while invoke PDV while decrypt body: ${e} `
                  );
                  // Error case: we fail to decrypt  the request body -> we write the same event on the retry queque with a decremented retryCount
                  writeMessageIntoQueue(
                    bodyEncrypted,
                    clientId,
                    retryCount - 1,
                    config
                  );
                },
                // Happy path: we successfully decrypted the request body and can retry sending the email
                async bodyDecrypted => {
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
                    mailTrasporter,
                    config,
                    retryCount - 1
                  );
                }
              )
            )();
          } catch (e) {
            logger.error(
              `Caught exception while processing message from retry queue with messageId ${message.messageId}`
            );
          }
        }
      }
    } catch (e) {
      logger.error(
        `Caught exception while retrieving messages from queue: ${e}`
      );
    }
  };

  setInterval(retrieveMessage, 1000);
};
