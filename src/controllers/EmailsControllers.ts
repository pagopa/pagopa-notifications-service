/**
 * PaymentControllers
 * RESTful Controllers for Payments Endpoints
 */
import * as express from "express";
import { isLeft } from "fp-ts/lib/Either";
import {
  ResponseErrorFromValidationErrors,
  ResponseSuccessJson
} from "@pagopa/ts-commons/lib/responses";

import { TypeofApiResponse } from "@pagopa/ts-commons/lib/requests";
import { Logger } from "winston";
import * as Handlebars from "handlebars";
import * as AWS from "aws-sdk";
import { AsControllerFunction, AsControllerResponseType } from "../util/types";
import { SendNotificationEmailT } from "../generated/definitions/requestTypes";
import { IConfig } from "../util/config";
import { NotificationEmailRequest } from "../generated/definitions/NotificationEmailRequest";

const SES_CONFIG = {
  accessKeyId: "<SES IAM user access key>",
  region: "us-west-2",
  secretAccessKey: "<SES IAM user secret access key>"
};

const AWS_SES = new AWS.SES(SES_CONFIG);

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const sendEmail = (recipientEmail: string, name: string, data: string) => {
  const params = {
    Destination: {
      ToAddresses: [recipientEmail]
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: data
        }
      },
      Subject: {
        Charset: "UTF-8",
        Data: `Hello, ${name}!`
      }
    },
    ReplyToAddresses: [],
    Source: "<email address you verified>"
  };
  return AWS_SES.sendEmail(params).promise();
};

export const sendMailController: (
  config: IConfig,
  logger: Logger
) => AsControllerFunction<SendNotificationEmailT> = (
  config,
  logger
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
) => async params => {
  logger.info(params.body.from);

  const data = {
    your: params.body.body
  };

  const content = "<b>{{your}}</b>";
  const template = Handlebars.compile(content);

  const dataEmail = template(data);

  await sendEmail(params.body.to, params.body.to, dataEmail);

  return ResponseSuccessJson({ outcome: "OK" });
};

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
export function sendMail(
  config: IConfig,
  logger: Logger
): (
  req: express.Request
) => Promise<
  AsControllerResponseType<TypeofApiResponse<SendNotificationEmailT>>
> {
  const controller = sendMailController(config, logger);
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  return async req => {
    // Validate input provided
    const errorOrNotificationEmailRequest = NotificationEmailRequest.decode(
      req.body
    );

    if (isLeft(errorOrNotificationEmailRequest)) {
      const error = errorOrNotificationEmailRequest.left;
      return ResponseErrorFromValidationErrors(NotificationEmailRequest)(error);
    }
    const notificationEmailRequest = errorOrNotificationEmailRequest.right;
    return controller({ body: notificationEmailRequest });
  };
}
