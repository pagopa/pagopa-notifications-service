import { Transporter } from "nodemailer";
import * as SESTransport from "nodemailer/lib/ses-transport";
import { Browser } from "puppeteer";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import { NotificationEmailRequest } from "@src/generated/definitions/NotificationEmailRequest";
import { decryptBody } from "../util/confidentialDataManager";
import { sendEmail } from "../controllers/EmailsControllers";
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
        const { clientId, paramsEncrypted, retryCount } = JSON.parse(
          message.messageText
        );
        await pipe(
          decryptBody(paramsEncrypted),
          TE.map(async paramsDecrypted => {
            const bodyRequest = JSON.parse(
              paramsDecrypted
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
          })
        )();
      }
    }
  };

  setInterval(retrieveMessage, 1000);
};
