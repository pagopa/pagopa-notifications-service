import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/lib/Option";
import apm = require("elastic-apm-node");
import { errorQueueClient } from "../util/queues";

const deadLetterErrorLabels: apm.Labels = {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  deadLetterEvent_category: "RETRY_EVENT_NO_ATTEMPTS_LEFT",
  // eslint-disable-next-line @typescript-eslint/naming-convention
  deadLetterEvent_serviceName: "pagopa-notifications-service"
};
export const sendMessageToErrorQueue = async (
  bodyEncrypted: string,
  clientId: string
): Promise<void> => {
  const sendDeadLetterQueueMessage = errorQueueClient.sendMessage(
    JSON.stringify({
      bodyEncrypted,
      clientId
    })
  );
  await pipe(
    O.fromNullable(
      apm.startTransaction("No attempts left for retry user mail send")
    ),
    O.map(transaction => {
      const span = transaction.startSpan("Writing event to dead letter queue");
      return { span, transaction };
    }),
    O.map(({ span, transaction }) => {
      span?.addLabels(deadLetterErrorLabels);
      return { span, transaction };
    }),
    O.fold(
      async () => sendDeadLetterQueueMessage,
      async ({ span, transaction }) => {
        span?.end();
        transaction?.end();
        return sendDeadLetterQueueMessage;
      }
    )
  );
};
