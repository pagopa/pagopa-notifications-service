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
import { createTemplateCache } from "../util/templateCache";
import { requestContext } from "../util/contextStorage";

export const addRetryQueueListener = (
  config: IConfig,
  mailTrasporter: Transporter<SESTransport.SentMessageInfo>
): void => {
  // Create the template cache when the listener is initialized
  const templateCache = createTemplateCache();

  const retrieveMessage = async (): Promise<void> => {
    try {
      const messages = await retryQueueClient.receiveMessages({
        numberOfMessages: 14
      });

      if (messages?.receivedMessageItems.length > 0) {
        logger.info("Retrieved messages from retry queue", {
          ctx_details: JSON.stringify({
            messages_queue_length: messages.receivedMessageItems.length
          })
        });

        for (const message of messages.receivedMessageItems) {
          const storage = requestContext.getStore();
          if (storage) {
            storage.message_id = message.messageId;
          }

          try {
            await retryQueueClient.deleteMessage(
              message.messageId,
              message.popReceipt
            );

            const { clientId, bodyEncrypted, retryCount } = JSON.parse(
              message.messageText
            );

            await pipe(
              decryptBody(bodyEncrypted),
              TE.bimap(
                e => {
                  logger.error("Error while invoke PDV while decrypt body", {
                    event_outcome: "failure",
                    error: {
                      message: e.message
                    }
                  });
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
                      ApiKeyAuth: "",
                      "X-Client-Id": clientId,
                      body: bodyRequest
                    },
                    schema,
                    mailTrasporter,
                    config,
                    retryCount - 1,
                    templateCache
                  );
                }
              )
            )();
          } catch (e) {
            logger.error(
              "Caught exception while processing message from retry queue",
              {
                event_outcome: "failure",
                error: {
                  message: (e as Error).message
                }
              }
            );
          }
        }
      }
    } catch (e) {
      logger.error(`Caught exception while retrieving messages from queue`, {
        event_outcome: "failure",
        error: {
          message: (e as Error).message
        }
      });
    }
  };

  setInterval(retrieveMessage, 1000);
};
