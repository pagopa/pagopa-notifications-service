import { Request, Response, NextFunction } from "express";
import apiKeyFilter from "../util/ApiKeyFilter";
import { getConfigOrThrow } from "../util/config";

const config = getConfigOrThrow();

describe("apiKeyFilter middleware", () => {
  function getMockReq(path: string, apiKey?: string | string[]) {
    const headers: Record<string, any> = {};
    if (apiKey !== undefined) headers["x-api-key"] = apiKey;
    return {
      path,
      headers
    } as unknown as Request;
  }

  function getMockRes() {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res as Response;
  }

  function getMockNext() {
    return jest.fn();
  }

  test("test_allows_request_with_valid_api_key", () => {
    const securedPath = "/emails";
    const validApiKeys = [
      config.SECURITY_API_KEY_PRIMARY,
      config.SECURITY_API_KEY_SECONDARY
    ];

    for (const apiKey of validApiKeys) {
      const req = getMockReq(securedPath, apiKey);
      const res = getMockRes();
      const next = getMockNext();

      apiKeyFilter(req, res, next);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.send).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    }
  });

  test("test_rejects_request_with_invalid_or_missing_api_key", () => {
    const securedPath = "/emails";
    const invalidApiKeys = [undefined, "", "   ", "invalid-key"];

    for (const apiKey of invalidApiKeys) {
      const req = getMockReq(securedPath, apiKey as any);
      const res = getMockRes();
      const next = getMockNext();

      apiKeyFilter(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith("Unauthorized");
      expect(next).not.toHaveBeenCalled();
    }
  });

  test("test_allows_request_to_non_secured_path", () => {
    const nonSecuredPaths = ["/public", "/status", "/api"];
    const apiKeys = [undefined, "", "invalid-key", config.SECURITY_API_KEY_PRIMARY];

    for (const path of nonSecuredPaths) {
      for (const apiKey of apiKeys) {
        const req = getMockReq(path, apiKey as any);
        const res = getMockRes();
        const next = getMockNext();

        apiKeyFilter(req, res, next);

        expect(res.status).not.toHaveBeenCalled();
        expect(res.send).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalled();
      }
    }
  });
});