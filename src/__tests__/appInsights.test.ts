import * as lib_ai from "@pagopa/ts-commons/lib/appinsights";
import { TelemetryClient } from "applicationinsights";
import * as ai from "applicationinsights";
import { trackTrace } from "../util/appInsights";
jest.mock("applicationinsights");

describe("app insight utils test", () => {
  const mockClient = new ai.TelemetryClient();

  it("should call init when no telemetry client is defined", () => {
    const traceMessage = "TEST MESSAGE";
    const traceSeverity = ai.Contracts.SeverityLevel.Error;
    const spyInit = jest.spyOn(lib_ai, "initAppInsights");

    trackTrace(traceMessage, traceSeverity);
    expect(spyInit).toHaveBeenCalledTimes(1);
  });
});