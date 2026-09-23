import { AsyncLocalStorage } from "node:async_hooks";
import { NextFunction, Request, Response } from "express";

export interface IRequestContext {
  event_action: string;
  ctx_client_id: string;
  message?: string;
  template_id?: string;
  message_id?: string;
}

export const requestContext = new AsyncLocalStorage<IRequestContext>();

export const storageMiddleware = (
  req: Request,
  _: Response,
  next: NextFunction
): void => {
  const clientIdHeader = req.headers["x-client-id"];
  const clientId = Array.isArray(clientIdHeader)
    ? clientIdHeader[0]
    : clientIdHeader;

  requestContext.run(
    {
      ctx_client_id: clientId ?? "{clientId-not-found}",
      event_action: `${req.method} ${req.path}`
    },
    async () => next()
  );
};
