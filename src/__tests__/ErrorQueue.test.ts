import { sendMessageToErrorQueue } from "../queues/ErrorQueue"
import { errorQueueClient } from "../util/queues";
import apm = require("elastic-apm-node");
describe("error queue", () => {

    beforeEach(async () => {
        jest.resetAllMocks();
    });

    it("Message written to dead letter queue writing span", () => {
        jest.useFakeTimers();
        const spySendMessages = jest.spyOn(errorQueueClient, 'sendMessage');
        const transaction = apm.startTransaction("test transaction");
        const span = transaction!.startSpan("test span");
        const addLabelsSpanSpy = jest.spyOn(span!, "addLabels");
        const endSpanSpy = jest.spyOn(span!, "end");
        const apmStartTransactionSpy = jest.spyOn(apm, 'startTransaction').mockReturnValue(transaction);
        const transactionStartSpanSpy = jest.spyOn(transaction!, 'startSpan').mockReturnValue(span);
        sendMessageToErrorQueue("clientId", "bodyEncryted");
        expect(apmStartTransactionSpy).toBeCalledTimes(1);
        expect(transactionStartSpanSpy).toBeCalledTimes(1);
        expect(addLabelsSpanSpy).toBeCalledWith({
            "deadLetterEvent_category": "RETRY_EVENT_NO_ATTEMPTS_LEFT",
            "deadLetterEvent_serviceName": "pagopa-notifications-service"
          });
        expect(endSpanSpy).toBeCalledTimes(1);
        expect(spySendMessages).toBeCalledTimes(1);
        jest.useRealTimers();
    });

    it("Message written to dead letter queue when returned span is null", () => {
        jest.useFakeTimers();
        const spySendMessages = jest.spyOn(errorQueueClient, 'sendMessage');
        const apmStartSpanSpy = jest.spyOn(apm, 'startTransaction').mockReturnValue(null);
        sendMessageToErrorQueue("clientId", "bodyEncryted");
        expect(apmStartSpanSpy).toBeCalledTimes(1);
        expect(spySendMessages).toBeCalledTimes(1);
        jest.useRealTimers();
    });
});
