import * as loggerTS from "../util/logger";

describe("logger", () => {
    it("get logger", () => {
        expect(loggerTS.logger).toBeDefined();
    });
  });