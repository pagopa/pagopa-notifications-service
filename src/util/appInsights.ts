import { initAppInsights } from "@pagopa/ts-commons/lib/appinsights";
import * as ai from "applicationinsights";
import * as packageJson from "../../package.json";
import { getConfigOrThrow } from "./config";

const config = getConfigOrThrow();

export const getTelemetryClient = (): ai.TelemetryClient =>
  ai.defaultClient
    ? ai.defaultClient
    : ((initAppInsights(config.AI_INSTRUMENTATION_KEY, {
        cloudRole: packageJson.name,
        disableAppInsights: config.AI_ENABLED !== true,
        samplingPercentage: config.AI_SAMPLING_PERCENTAGE
      }) as unknown) as ai.TelemetryClient);

export const trackServiceStartup = (): void => {
  const telemetryClient: ai.TelemetryClient = getTelemetryClient();
  telemetryClient.trackEvent({
    name: "notifications-service STARTED"
  });
};

export const trackTrace = (
  message: string,
  severity?: ai.Contracts.SeverityLevel
): void => {
  const telemetryClient: ai.TelemetryClient = getTelemetryClient();
  telemetryClient.trackTrace({ message, severity });
};
