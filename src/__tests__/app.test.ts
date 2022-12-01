import { startApp } from "../app";
import { getConfigOrThrow } from "../util/config";
import { Logger } from "winston";

describe("app", () => {

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  
  it("should get server response", async () => {

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

    const server = startApp;

    const serverResponse = await server(config,logger);

    expect(serverResponse).toBeDefined();
  });
});
