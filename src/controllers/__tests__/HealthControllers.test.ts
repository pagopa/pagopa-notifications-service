import { getHealth } from "../HealthControllers";
import { Logger } from "winston";
import { NotificationsServiceClientConfig, IConfig } from "../../util/config";
import { GetSendQuotaCommandOutput } from "@aws-sdk/client-ses/dist-types/commands/GetSendQuotaCommand";
import { of } from "fp-ts/TaskEither";


describe("health check", () => {

  const logger = {
    // tslint:disable-next-line: no-console
    error: jest.fn().mockImplementation(console.log),
    // tslint:disable-next-line: no-console
    info: jest.fn().mockImplementation(console.log),
    // tslint:disable-next-line: no-console
    verbose: jest.fn().mockImplementation(console.log),
    // tslint:disable-next-line: no-console
    warn: jest.fn().mockImplementation(console.log),
    // tslint:disable-next-line: no-console
    debug: jest.fn().mockImplementation(console.log)
  } as unknown as Logger;

  const config = {
    AI_ENABLED: false,
    AI_INSTRUMENTATION_KEY: "key",
    AI_SAMPLING_PERCENTAGE: 0,
    AWS_SES_ACCESS_KEY_ID: "aws_access_key",
    AWS_SES_REGION: "aws_region",
    AWS_SES_SECRET_ACCESS_KEY: "aws_secret",
    CLIENT_ECOMMERCE: {TEMPLATE_IDS: ["fake template"]} as NotificationsServiceClientConfig,
    CLIENT_ECOMMERCE_TEST: {TEMPLATE_IDS: ["fake template test"]} as NotificationsServiceClientConfig,
    CLIENT_PAYMENT_MANAGER: {TEMPLATE_IDS: ["fake template payment manager"]} as NotificationsServiceClientConfig,
    ERROR_QUEUE_NAME: "error q name",
    INITIAL_RETRY_TIMEOUT_SECONDS: 10,
    MAX_RETRY_ATTEMPTS: 3,
    PORT: 3240,
    RETRY_QUEUE_NAME: "retry q name",
    STORAGE_CONNECTION_STRING: "storageconnection"
  } as IConfig;


  it("should return a error response", async () => {
    const handler = getHealth(config, logger);

    const request = {} as any;

    const response = await handler(request);

    expect(response.kind).toBe("IResponseErrorGeneric");
  });

  xit("should return a success response", async () => {

    const getSendQuotaCommandOutput : GetSendQuotaCommandOutput = {$metadata: {}};

    jest.mock("../HealthControllers", () => ({
      checkSESTask () {
        return new Promise<GetSendQuotaCommandOutput>(of(getSendQuotaCommandOutput));
      }
    }));

    const handler = getHealth(config, logger);

    const request = {} as any;

    const response = await handler(request);

    expect(response.kind).toBe("IResponseSuccessJson");
  });
});