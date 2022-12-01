import { Logger } from "winston";
import { getInfo } from "../InfoControllers";
import { getConfigOrThrow } from "../../util/config";

describe("getInfo", () => {
  const config = getConfigOrThrow();

  const logger = {
    // tslint:disable-next-line: no-console
    error: jest.fn().mockImplementation(console.log),
    // tslint:disable-next-line: no-console
    info: jest.fn().mockImplementation(console.log),
    // tslint:disable-next-line: no-console
    verbose: jest.fn().mockImplementation(console.log),
    // tslint:disable-next-line: no-console
    warn: jest.fn().mockImplementation(console.log),
    // tslint:disable-next-line: no-console
    debug: jest.fn().mockImplementation(console.log)
  } as unknown as Logger;

  it("should return a right response", async () => {
      const handler = getInfo(config, logger);

      const request = {} as any;

      const response = await handler(request);

      expect(response.kind).toBe("IResponseSuccessJson");
    });
});