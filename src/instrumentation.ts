import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { Resource } from "@opentelemetry/resources";
import { ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";
import packageJson from "../package.json";

const appVersion = packageJson.version;

const resource = Resource.default().merge(
  new Resource({
    [ATTR_SERVICE_VERSION]: `${appVersion}`
  })
);

const sdk = new NodeSDK({
  instrumentations: [getNodeAutoInstrumentations()],
  metricReader: new PrometheusExporter(),
  resource,
  traceExporter: new OTLPTraceExporter()
});

sdk.start();
