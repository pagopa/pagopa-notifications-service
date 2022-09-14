import {
  ApplicationInsightsConfig,
  initAppInsights as startAppInsights
} from "@pagopa/ts-commons/lib/appinsights";
import * as appInsights from "applicationinsights";

export const initAppInsights = (
  instrumentationKey: string,
  config: ApplicationInsightsConfig = {}
): appInsights.TelemetryClient => {
  startAppInsights(instrumentationKey, config);
  return appInsights.defaultClient;
};
