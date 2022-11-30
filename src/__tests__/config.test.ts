import * as config from "../util/config"
import { IConfig } from "../util/config";
import * as dotenv from "dotenv";
import { either } from "fp-ts";
import { Validation } from "io-ts";

describe("config", () => {
    it("check getConfig", () => {
      const conf = config.getConfig();
      expect(conf).toBeDefined();
    });

    it("check getConfigOrThrow", () => {
      const confOrThrow = config.getConfigOrThrow();
      expect(confOrThrow).toBeDefined();
    });

    xit("check throw", () => {  
      const spyGetConfig = jest.spyOn(config,'getConfig').mockImplementation(() => {throw new Error("")});
      const confOrThrow = config.getConfigOrThrow();
      //expect(spyGetConfig).toThrowError();
      //expect(confOrThrow).toEqual({});
    });
    
  });