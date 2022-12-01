import * as app from "../app";

import * as configuration from "../util/config";
import { Logger } from "winston";
import { retryQueueClient } from "../util/queues";
import { QueueReceiveMessageResponse } from "@azure/storage-queue";
import { addRetryQueueListener } from "../queues/RetryQueueListener";

describe("app", () => {

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

  
    it("should work", async () => {
     
     // jest.spyOn(global,'setInterval');
      var logger: Logger;

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

      var server = app.startApp;

      const serverResponse = await server(config,logger);

      expect(serverResponse).toBeDefined();
    });
  });
