import { logger } from "../util/logger";
import packageJson from "../../package.json";

describe("logger", () => {
    it("get logger", () => {
        expect(logger).toBeDefined();
    });

    it("logs should be ECS formatted",()=>{
        const logMessage = "TEST LOG"
        //take format configured for winston logger
        const loggerFormat = logger.format
        //make it perform a log transformation
        const logString = JSON.stringify(loggerFormat.transform({
            level: "INFO",
            message: logMessage
        }))
        const parsedLog = JSON.parse(logString);
        expect(parsedLog.message).toEqual(logMessage)
        //instrumentation arguments
        expect(parsedLog['service.name']).toEqual("pagopa-notifications-service")
        expect(parsedLog['service.version']).toEqual(packageJson.version)
        expect(parsedLog['service.environment']).toEqual("test")
        })
});