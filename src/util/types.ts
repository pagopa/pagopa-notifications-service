import {
  IResponseType,
  TypeofApiParams,
  TypeofApiResponse
} from "@pagopa/ts-commons/lib/requests";
import {
  IResponseErrorGeneric,
  IResponseErrorNotFound,
  IResponseErrorValidation,
  IResponseSuccessJson,
  ProblemJson
} from "@pagopa/ts-commons/lib/responses";

export type AsControllerResponseType<T> = T extends IResponseType<200, infer R>
  ? IResponseSuccessJson<R>
  : T extends IResponseType<400, ProblemJson>
  ? IResponseErrorValidation
  : T extends IResponseType<404, ProblemJson>
  ? IResponseErrorNotFound
  : T extends IResponseType<500, ProblemJson>
  ? IResponseErrorGeneric
  : never;

export type AsControllerFunction<T> = (
  params: TypeofApiParams<T>
) => Promise<AsControllerResponseType<TypeofApiResponse<T>>>;
