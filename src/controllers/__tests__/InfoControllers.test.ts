import { IConfig, NotificationsServiceClientConfig } from "../../util/config"
import { getInfo } from "../InfoControllers"
import { logger } from "../../util/logger";

const configMock = {
  AWS_SES_ACCESS_KEY_ID: "AWS_SES_ACCESS_KEY_ID",
  AWS_SES_REGION: "AWS_SES_REGION",
  AWS_SES_SECRET_ACCESS_KEY: "AWS_SES_SECRET_ACCESS_KEY",
  CLIENT_PAYMENT_MANAGER: { TEMPLATE_IDS: ["poc-1"] } as NotificationsServiceClientConfig,
  CLIENT_ECOMMERCE: { TEMPLATE_IDS: ["poc-1"] } as NotificationsServiceClientConfig,
  PORT: 8080
} as IConfig;


it("should return success", async () => {
  const controller = getInfo(configMock, logger);

  const response = await controller({} as any);

  expect(response.kind).toBe("IResponseSuccessJson");
});

