import { GetSendQuotaCommand, GetSendQuotaResponse, SESClient } from "@aws-sdk/client-ses";
import { IConfig, NotificationsServiceClientConfig } from "../../util/config";
import { logger } from "../../util/logger";
import { getHealth } from "../HealthControllers";

const configMock = {
  AWS_SES_ACCESS_KEY_ID: "AWS_SES_ACCESS_KEY_ID",
  AWS_SES_REGION: "AWS_SES_REGION",
  AWS_SES_SECRET_ACCESS_KEY: "AWS_SES_SECRET_ACCESS_KEY",
  CLIENT_PAYMENT_MANAGER: { TEMPLATE_IDS: ["poc-1"] } as NotificationsServiceClientConfig,
  CLIENT_ECOMMERCE: { TEMPLATE_IDS: ["poc-1"] } as NotificationsServiceClientConfig,
  PORT: 8080
} as IConfig;


describe('When service health request', () => {
  it("SESClient unreachable, should return error", async () => {
    const mockSESClient = jest
    .spyOn(SESClient.prototype, 'send')
    .mockImplementation(() => {
      throw Error("Test error")
  }); 

    const controller = getHealth(configMock, logger);

    const response = await controller({} as any);

    expect(response.kind).toBe("IResponseErrorGeneric");
    expect(response.detail).toContain("Test error");
    expect(mockSESClient).toHaveBeenCalled();
  });

  it("SESClient reachable, should return success", async () => {
    const mockSESClient = jest
    .spyOn(SESClient.prototype, 'send')
    .mockImplementation(() => {
      return Promise.resolve({
        Max24HourSend: 1000,
        MaxSendRate: 1000,
        SentLast24Hours: 10
      } as GetSendQuotaResponse);
  }); 
  
    const controller = getHealth(configMock, logger);

    const response = await controller({} as any);

    expect(response.kind).toBe("IResponseSuccessJson");
    expect(mockSESClient).toHaveBeenCalled();
  });
});
