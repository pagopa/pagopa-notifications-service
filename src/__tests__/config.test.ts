import * as config from "../util/config"

describe("config", () => {
    it("check getConfig", () => {
      const conf = config.getConfig();
      expect(conf).toBeDefined();
    });

    it("check getConfigOrThrow", () => {
      const confOrThrow = config.getConfigOrThrow();
      expect(confOrThrow).toBeDefined();
    });
    
  });