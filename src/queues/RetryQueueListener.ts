import { Transporter } from "nodemailer";
import * as SESTransport from "nodemailer/lib/ses-transport";
import { Browser } from "puppeteer";
import { IConfig } from "../util/config";
import { retryQueueClient } from "../util/queues";
import { logger } from "../util/logger";
import * as TE from "fp-ts/lib/TaskEither";
import { sendEmail } from "../controllers/EmailsControllers";
import { decryptEmail } from "@src/util/confidentialDataManager";
import { NotificationEmailRequest } from "@src/generated/definitions/NotificationEmailRequest";
import { pipe } from "fp-ts/lib/function";
import { EmailString } from "@pagopa/ts-commons/lib/strings";

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
        pipe(
          decryptEmail( (params as NotificationEmailRequest).to),
          TE.map((email) => {
            (params as NotificationEmailRequest).to = email as EmailString
            void sendEmail(
              params,
              schema,
              browserEngine,
              mailTrasporter,
              config,
              retryCount - 1
            );
          }) 
        )
       
      }
    }
  };

  setInterval(retrieveMessage, 1000);
};
