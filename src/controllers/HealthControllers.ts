/**
 * HealthControllers
 * RESTful Controllers for pod health related informations
 */
import {
  GetSendQuotaCommand,
  GetSendQuotaCommandOutput,
  SESClient
} from "@aws-sdk/client-ses";
import { Logger } from "winston";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/lib/function";
import * as express from "express";
import {
  HttpStatusCodeEnum,
  IResponseErrorGeneric,
  IResponseSuccessJson,
  ResponseErrorGeneric,
  ResponseSuccessJson
} from "@pagopa/ts-commons/lib/responses";
import { TypeofApiResponse } from "@pagopa/ts-commons/lib/requests";
import { IConfig } from "../util/config";
import { GetHealthT } from "../generated/definitions/requestTypes";
import { AsControllerFunction, AsControllerResponseType } from "../util/types";

const checkSESTask = (
  config: IConfig,
  logger: Logger
): TE.TaskEither<string, GetSendQuotaCommandOutput> => {
  const sesClient = new SESClient({
    credentials: {
      accessKeyId: config.AWS_SES_ACCESS_KEY_ID,
      secretAccessKey: config.AWS_SES_SECRET_ACCESS_KEY
    },
    region: config.AWS_SES_REGION,
    tls: true
  });
  const command = new GetSendQuotaCommand({});

  return TE.tryCatch(
    () => sesClient.send(command),
    reason => {
      logger.error(
        `Error during AWS SES connectivity check - Reason: ${reason}`
      );
      return String(reason);
    }
  );
};

const healthcheck = (
  config: IConfig,
  logger: Logger
): Promise<IResponseErrorGeneric | IResponseSuccessJson<GetHealthT>> => {
  logger.info("Healthcheck started");

  return pipe(
    checkSESTask(config, logger),
    TE.mapLeft(err =>
      ResponseErrorGeneric(
        HttpStatusCodeEnum.HTTP_STATUS_500,
        "Generic server error",
        `Service not healthy. Reason: ${err}`
      )
    ),
    TE.map(resp =>
      ResponseSuccessJson(({
        sentLast24Hours: resp.SentLast24Hours
      } as unknown) as GetHealthT)
    ),
    TE.toUnion
  )();
};

export const healthController: (
  config: IConfig,
  logger: Logger
) => AsControllerFunction<GetHealthT> = (config, logger) => async params => {
  logger.info("Retrieving service health");
  return await healthcheck(config, logger);
};

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
export function getHealth(
  config: IConfig,
  logger: Logger
): (
  req: express.Request
) => Promise<AsControllerResponseType<TypeofApiResponse<GetHealthT>>> {
  const controller = healthController(config, logger);
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  return async _req => pipe(controller({}));
}
