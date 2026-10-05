import { AsyncLocalStorage } from "node:async_hooks";
import { NextFunction, Request, Response } from "express";

export interface IRequestContext {
  event_action?: string;
  ctx_client_id?: string;
  ctx_transaction_id?: string;
  message?: string;
  message_id?: string;
}

export const requestContext = new AsyncLocalStorage<IRequestContext>();

export const storageMiddleware = (
  req: Request,
  _: Response,
  next: NextFunction
): void => {
  if (req.path !== "/emails") {
    requestContext.run({}, async () => next());
  } else {
    const clientIdHeader = req.headers["x-client-id"];
    const clientId = Array.isArray(clientIdHeader)
      ? clientIdHeader[0]
      : clientIdHeader;

    requestContext.run(
      {
        ctx_client_id: clientId ?? "{clientId-not-found}",
        ctx_transaction_id:
          req.body?.parameters?.transaction?.id ?? "{transactionId-not-found}",
        event_action: `${req.method} ${req.path}`
      },
      async () => next()
    );
  }
};
