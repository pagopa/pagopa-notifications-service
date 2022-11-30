import { Logger } from "winston";
import * as InfoControllers from "../InfoControllers";
import * as configuration from "../../util/config";

describe("getInfo", () => {
  var config = configuration.getConfigOrThrow();

  var logger = {
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

  it("should return a right response",async () => {
      var handler = InfoControllers.getInfo(config, logger);

      var req2 = {} as any;

      const responseErrorValidation2 = await handler(req2);

      expect(responseErrorValidation2.kind).toBe("IResponseSuccessJson");

    });
});