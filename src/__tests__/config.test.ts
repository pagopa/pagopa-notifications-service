import * as config from "../util/config"

describe("config", () => {
    it("check getConfig", () => {
      const conf = config.getConfig();
      const confOrThrow = config.getConfigOrThrow();
    });
  });