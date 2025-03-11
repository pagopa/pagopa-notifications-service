import { sendMessageToErrorQueue } from "../queues/ErrorQueue"
import { errorQueueClient } from "../util/queues";
import opentelemetry from "@opentelemetry/api";
describe("error queue", () => {

    beforeEach(async () => {
        jest.resetAllMocks();
    });

    it("Message written to dead letter queue writing span", () => {
        jest.useFakeTimers();
        const spySendMessages = jest.spyOn(errorQueueClient, 'sendMessage');
        const otelTracer = opentelemetry.trace.getTracer("mocked tracer");
        const span = otelTracer.startSpan("mocked span");
        const setSpanAttributesSpy = jest.spyOn(span, "setAttribute");
        const endSpanSpy = jest.spyOn(span!, "end");
        sendMessageToErrorQueue("clientId", "bodyEncryted", span);
        expect(setSpanAttributesSpy).toBeCalledTimes(2);
        expect(setSpanAttributesSpy).toBeCalledWith("deadLetterEvent_category", "RETRY_EVENT_NO_ATTEMPTS_LEFT");
        expect(setSpanAttributesSpy).toBeCalledWith("deadLetterEvent_serviceName", "pagopa-notifications-service");
        expect(endSpanSpy).toBeCalledTimes(1);
        expect(spySendMessages).toBeCalledTimes(1);
        jest.useRealTimers();
    });
});
