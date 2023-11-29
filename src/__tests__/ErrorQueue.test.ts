import { sendMessageToErrorQueue } from "../queues/ErrorQueue"
import { errorQueueClient } from "../util/queues";

describe("error queue", () => {
    
    it("sendMessageToErrorQueue", () => {
        jest.useFakeTimers();
        const spySendMessages = jest.spyOn(errorQueueClient,'sendMessage');
        sendMessageToErrorQueue("clientId","bodyEncryted");
        expect(spySendMessages).toBeCalled();
        jest.useRealTimers();
    });
});
