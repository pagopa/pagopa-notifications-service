import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-grpc";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { Resource } from "@opentelemetry/resources";
import { ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import packageJson from "../package.json";

const appVersion = packageJson.version;

const resource = Resource.default().merge(
  new Resource({
    [ATTR_SERVICE_VERSION]: `${appVersion}`
  })
);

const traceExporter = new OTLPTraceExporter({});
const metricExporter = new OTLPMetricExporter({});

const sdk = new NodeSDK({
  instrumentations: [getNodeAutoInstrumentations()],
  metricReader: new PeriodicExportingMetricReader({
    exporter: metricExporter
  }),
  resource,
  traceExporter
});
sdk.start();
