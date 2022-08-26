/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * InfoControllers
 * RESTful Controllers for service related informations
 */
import { TypeofApiResponse } from "@pagopa/ts-commons/lib/requests";
import { ResponseSuccessJson } from "@pagopa/ts-commons/lib/responses";
import * as express from "express";
import { Logger } from "winston";
import { pipe } from "fp-ts/lib/function";
import * as packageJson from "../../package.json";
import { GetInfoT } from "../generated/definitions/requestTypes";
import { IConfig } from "../util/config";
import { AsControllerFunction, AsControllerResponseType } from "../util/types";

export const infoController: (
  config: IConfig,
  logger: Logger
) => AsControllerFunction<GetInfoT> = (
  config,
  logger
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
) => async params => {
  logger.debug("Retrieving service info");
  return ResponseSuccessJson({
    name: packageJson.name,
    version: packageJson.version
  });
};

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
export function getInfo(
  config: IConfig,
  logger: Logger
): (
  req: express.Request
) => Promise<AsControllerResponseType<TypeofApiResponse<GetInfoT>>> {
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const controller = infoController(config, logger);
  return async req => pipe(controller({}));
}
