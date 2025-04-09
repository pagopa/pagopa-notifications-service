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

    it("check throw", () => {  
      const spyGetConfig = jest.spyOn(config,'getConfig').mockImplementation(() => {throw new Error("")});
      const confOrThrow = config.getConfigOrThrow();
    });

    it("check getConfig with AWS_SES_ENDPOINT", () => {
      const conf = config.getConfigOrThrow();
      expect(conf.AWS_SES_ENDPOINT).toEqual("http://localhost:8005");
    });
    
  });