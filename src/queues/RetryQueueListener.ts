import { Transporter } from "nodemailer";
import * as SESTransport from "nodemailer/lib/ses-transport";
import { Browser } from "puppeteer";
import { IConfig } from "../util/config";
import { retryQueueClient } from "../util/queues";
import { logger } from "../util/logger";
import { sendEmail } from "../controllers/EmailsControllers";

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
        const templateId = params.body.templateId;
        const schema = await import(
          `../generated/templates/${templateId}/schema.js`
        );
        logger.info("Send Email");
        void sendEmail(
          params,
          schema,
          browserEngine,
          mailTrasporter,
          config,
          retryCount - 1
        );
      }
    }
  };

  setInterval(retrieveMessage, 1000);
};
