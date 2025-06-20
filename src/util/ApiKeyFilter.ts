import { Request, Response, NextFunction } from "express";
import { getConfigOrThrow } from "./config";
import { logger } from "../util/logger";

const config = getConfigOrThrow();
const securedPaths = config.SECURITY_API_KEY_SECURED_PATHS;
const validApiKeys = [config.SECURITY_API_KEY_PRIMARY, config.SECURITY_API_KEY_SECONDARY];

function isValidApiKey(apiKey: string | undefined) {
  return apiKey && apiKey.trim() !== '' && validApiKeys.includes(apiKey);
}

function logWhichApiKey(apiKey: string | undefined, path: string) {
  let apiKeyType;
  if (apiKey === config.SECURITY_API_KEY_PRIMARY) {
    apiKeyType = 'primary';
  } else if (apiKey === config.SECURITY_API_KEY_SECONDARY) {
    apiKeyType = 'secondary';
  } else {
    apiKeyType = 'unknown';
  }

  logger.debug(`API key type used for path ${path}: ${apiKeyType}`);
}

// Middleware function
function apiKeyFilter(req: Request, res: Response, next: NextFunction) {
  const path = req.path;

  if (securedPaths.some(p => path.startsWith(p))) {
    const apiKeyHeader = req.headers['x-api-key'];
    const apiKey = Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : apiKeyHeader;

    if (!isValidApiKey(apiKey)) {
      logger.error(`Unauthorized request for path ${path} - Missing or invalid API key`);
      return res.status(401).send('Unauthorized');
    }

    logWhichApiKey(apiKey, path);
  }

  next(); // Continue to next middleware/route
}

export default apiKeyFilter;