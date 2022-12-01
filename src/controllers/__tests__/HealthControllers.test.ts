import * as HealthControllers from "../HealthControllers";
import { Logger } from "winston";
import * as configuration from "../../util/config";
import { right } from "fp-ts/lib/Separated";
import { IResponseSuccessJson } from "@pagopa/ts-commons/lib/responses";
import { GetHealthT } from "../../generated/definitions/requestTypes";
import { GetSendQuotaCommandOutput } from "@aws-sdk/client-ses/dist-types/commands/GetSendQuotaCommand";
import { taskEither } from "fp-ts";
import * as TE from "fp-ts/TaskEither";


describe("health check", () => {

  var logger = {
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

  var config = {
    AI_ENABLED: false,
    AI_INSTRUMENTATION_KEY: "key",
    AI_SAMPLING_PERCENTAGE: 0,
    AWS_SES_ACCESS_KEY_ID: "aws_access_key",
    AWS_SES_REGION: "aws_region",
    AWS_SES_SECRET_ACCESS_KEY: "aws_secret",
    CLIENT_ECOMMERCE: {TEMPLATE_IDS: ["fake template"]} as configuration.NotificationsServiceClientConfig,
    CLIENT_ECOMMERCE_TEST: {TEMPLATE_IDS: ["fake template test"]} as configuration.NotificationsServiceClientConfig,
    CLIENT_PAYMENT_MANAGER: {TEMPLATE_IDS: ["fake template payment manager"]} as configuration.NotificationsServiceClientConfig,
    ERROR_QUEUE_NAME: "error q name",
    INITIAL_RETRY_TIMEOUT_SECONDS: 10,
    MAX_RETRY_ATTEMPTS: 3,
    PORT: 3240,
    RETRY_QUEUE_NAME: "retry q name",
    STORAGE_CONNECTION_STRING: "storageconnection"
  } as configuration.IConfig;


    it("should return a error response",async () => {
      var handler = HealthControllers.getHealth(config, logger);

      var req2 = {} as any;

      const responseErrorValidation = await handler(req2);

      expect(responseErrorValidation.kind).toBe("IResponseErrorGeneric");
    });

    xit("should return a success response",async () => {

      const getSendQuotaCommandOutput : GetSendQuotaCommandOutput = {$metadata: {}};

      jest.mock("../HealthControllers", () => ({
        checkSESTask () {
          return new Promise<GetSendQuotaCommandOutput>(TE.of(getSendQuotaCommandOutput));
        }
      }));

      var handler = HealthControllers.getHealth(config, logger);

      var req2 = {} as any;

      const responseErrorValidation2 = await handler(req2);

      expect(responseErrorValidation2.kind).toBe("IResponseSuccessJson");
    });
});