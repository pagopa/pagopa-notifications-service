import { sendMessageToErrorQueue } from "../queues/ErrorQueue"
import { TypeofApiParams } from "@pagopa/ts-commons/lib/requests";
import { SendNotificationEmailT } from "../generated/definitions/requestTypes";
import { errorQueueClient } from "../util/queues";

describe("error queue", () => {
    
    it("sendMessageToErrorQueue", () => {
        jest.useFakeTimers();
        const spySendMessages = jest.spyOn(errorQueueClient,'sendMessage');
        sendMessageToErrorQueue({} as TypeofApiParams<SendNotificationEmailT>);
        expect(spySendMessages).toBeCalled();
        jest.useRealTimers();
    });
});