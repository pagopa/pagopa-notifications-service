import opentelemetry, { Span } from "@opentelemetry/api";
import { errorQueueClient } from "../util/queues";
import { logger } from "../util/logger";

const deadLetterErrorLabels = [
  { key: "deadLetterEvent_category", value: "RETRY_EVENT_NO_ATTEMPTS_LEFT" },
  { key: "deadLetterEvent_serviceName", value: "pagopa-notifications-service" }
];
const otelTracer = opentelemetry.trace.getTracer("notifications-service");
export const sendMessageToErrorQueue = async (
  bodyEncrypted: string,
  clientId: string,
  span: Span = otelTracer.startSpan("DLQ-event-written")
): Promise<void> => {
  const sendDeadLetterQueueMessage = errorQueueClient.sendMessage(
    JSON.stringify({
      bodyEncrypted,
      clientId
    })
  );

  logger.error(`Message failed too many times, added to error queue`, {
    event_outcome: "failure"
  });
  deadLetterErrorLabels.forEach(({ key, value }) =>
    span.setAttribute(key, value)
  );
  span.end();
  return void sendDeadLetterQueueMessage;
};
