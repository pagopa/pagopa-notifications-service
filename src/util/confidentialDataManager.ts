import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/lib/TaskEither";
import * as E from "fp-ts/lib/Either";
import { getConfigOrThrow } from "./config";
import { createClient } from "@src/generated/personal-data-vault/client";


const config = getConfigOrThrow();

export const apiPdvClient = createClient({
  baseUrl: config.PERSONAL_DATA_VAULT_API_HOST,
  basePath: config.PERSONAL_DATA_VAULT_API_BASE_PATH,
  fetchApi: fetch as any
});

export function encryptEmail (email: string): TE.TaskEither<Error, string> {
  return pipe(
    () => apiPdvClient.saveUsingPUT({
      api_key: config.PERSONAL_DATA_VAULT_API_KEY,
      body: {
        pii: email
      }
    }),
    TE.fold(
      (errs) => TE.left(Error(`Got error: ${errs}`)),
      (res) => {
      if (res.status === 200) {
        return TE.right(res.value.token);
      } else {
        return TE.left(new Error("foo"));
      }
    }),
  );
};

export function decryptEmail (opaqueData: string): TE.TaskEither<Error, string> {
  return pipe(
    () => apiPdvClient.findPiiUsingGET({
      api_key: config.PERSONAL_DATA_VAULT_API_KEY,
      token : opaqueData
    }),
    TE.fold(
      (errs) => TE.left(Error(`Got error: ${errs}`)),
      (res) => {
      if (res.status === 200) {
        return TE.right(res.value.pii);
      } else {
        return TE.left(new Error("foo"));
      }
    }),
  );
};
