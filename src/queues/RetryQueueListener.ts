import { Transporter } from "nodemailer";
import * as SESTransport from "nodemailer/lib/ses-transport";
import { Browser } from "puppeteer";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
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
        const { retryCount, ...params } = JSON.parse(message.messageText);
        logger.info(params);
        await pipe(
          decryptBody(params),
          TE.map(async bodyDecrypted => {
            const templateId = params.body.templateId;
            const schema = await import(
              `../generated/templates/${templateId}/schema.js`
            );
            void sendEmail(
              JSON.parse(bodyDecrypted),
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
