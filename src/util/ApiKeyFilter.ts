import { Request, Response, NextFunction } from "express";
import { logger } from "../util/logger";
import { getConfigOrThrow } from "./config";

const config = getConfigOrThrow();
const securedPaths = config.SECURITY_API_KEY_SECURED_PATHS;
const validApiKeys = [
  config.SECURITY_API_KEY_PRIMARY,
  config.SECURITY_API_KEY_SECONDARY
];

const isValidApiKey = (apiKey: string | undefined): boolean =>
  typeof apiKey === "string" &&
  apiKey.trim() !== "" &&
  validApiKeys.includes(apiKey);

const logWhichApiKey = (apiKey: string | undefined, path: string): void => {
  const apiKeyType =
    apiKey === config.SECURITY_API_KEY_PRIMARY
      ? "primary"
      : apiKey === config.SECURITY_API_KEY_SECONDARY
      ? "secondary"
      : "unknown";

  logger.debug(`API key type used for path ${path}: ${apiKeyType}`);
};

// Middleware function
const apiKeyFilter = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const path = req.path;
  const sanitizedPath = path.replace(/\n|\r/g, "");

  if (securedPaths.some(p => sanitizedPath.startsWith(p))) {
    const apiKeyHeader = req.headers["x-api-key"];
    const apiKey = Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : apiKeyHeader;

    if (!isValidApiKey(apiKey)) {
      logger.error(
        `Unauthorized request for path ${sanitizedPath} - Missing or invalid API key`
      );

      res.status(401).send("Unauthorized");
      return;
    }

    logWhichApiKey(apiKey, sanitizedPath);
  }

  next(); // Continue to next middleware/route
};

export default apiKeyFilter;
