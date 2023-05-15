import { errorQueueClient } from "../util/queues";

export const sendMessageToErrorQueue = async (
  bodyEncrypted: string,
  clientId: string
): Promise<void> => {
  await errorQueueClient.sendMessage(
    JSON.stringify({
      bodyEncrypted,
      clientId
    })
  );
};
