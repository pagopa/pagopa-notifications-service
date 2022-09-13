import { TypeofApiParams } from "@pagopa/ts-commons/lib/requests";
import { SendNotificationEmailT } from "../generated/definitions/requestTypes";
import { errorQueueClient } from "../util/queues";

export const sendMessageToErrorQueue = async (
  params: TypeofApiParams<SendNotificationEmailT>
): Promise<void> => {
  await errorQueueClient.sendMessage(JSON.stringify(params));
};
