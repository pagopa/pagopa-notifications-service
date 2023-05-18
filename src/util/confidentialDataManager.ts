import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/lib/TaskEither";
import nodeFetch from "node-fetch";
import { createClient } from "../generated/personal-data-vault/client";
import { getConfigOrThrow } from "./config";

const config = getConfigOrThrow();

/* eslint sort-keys: 0 */
/* eslint-disable  @typescript-eslint/no-explicit-any */
export const apiPdvClient = createClient({
  baseUrl: config.PERSONAL_DATA_VAULT_API_HOST,
  basePath: config.PERSONAL_DATA_VAULT_API_BASE_PATH,
  fetchApi: (nodeFetch as any) as typeof fetch
});

export const encryptBody = (body: string): TE.TaskEither<Error, string> =>
  pipe(
    () =>
      apiPdvClient.saveUsingPUT({
        api_key: config.PERSONAL_DATA_VAULT_API_KEY,
        body: {
          pii: body
        }
      }),
    TE.fold(
      errs => TE.left(Error(`Got error: ${errs}`)),
      res => {
        if (res.status === 200) {
          return TE.right(res.value.token);
        } else {
          return TE.left(new Error(`Got error: ${res.status}`));
        }
      }
    )
  );

export const decryptBody = (opaqueData: string): TE.TaskEither<Error, string> =>
  pipe(
    () =>
      apiPdvClient.findPiiUsingGET({
        api_key: config.PERSONAL_DATA_VAULT_API_KEY,
        token: opaqueData
      }),
    TE.fold(
      errs => TE.left(Error(`Got error: ${errs}`)),
      res => {
        if (res.status === 200) {
          return TE.right(res.value.pii);
        } else {
          return TE.left(new Error(`Got error: ${res.status}`));
        }
      }
    )
  );