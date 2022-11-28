import { IEmailStringTag } from "@pagopa/ts-commons/lib/strings";
import { ExternalWorkflowExecutionCancelRequestedEventAttributes } from "aws-sdk/clients/swf";
import * as ErrorQueue from "../queues/ErrorQueue"
import { TypeofApiParams } from "@pagopa/ts-commons/lib/requests";
import { SendNotificationEmailT } from "../generated/definitions/requestTypes";
import { errorQueueClient } from "../util/queues";
import { rootCertificates } from "tls";

xdescribe("error queue", () => {
    
    it("sendMessageToErrorQueue", () => {
        jest.useFakeTimers();
        const spySendMessages = jest.spyOn(errorQueueClient,'sendMessage');
        ErrorQueue.sendMessageToErrorQueue({} as TypeofApiParams<SendNotificationEmailT>);
        expect(spySendMessages).toBeCalled();
        jest.clearAllTimers();
        jest.useRealTimers();
    });
});