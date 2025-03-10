import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter as OTLPGrpcTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { Resource } from "@opentelemetry/resources";
import { ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import { OTLPMetricExporter as OTLPGrpcMetricExporter } from "@opentelemetry/exporter-metrics-otlp-grpc";
import { RuntimeNodeInstrumentation } from "@opentelemetry/instrumentation-runtime-node";
import {
  MeterProvider,
  PeriodicExportingMetricReader
} from "@opentelemetry/sdk-metrics";
import packageJson from "../package.json";

const appVersion = packageJson.version;

const resource = Resource.default().merge(
  new Resource({
    [ATTR_SERVICE_VERSION]: `${appVersion}`
  })
);
const metricReader = new PeriodicExportingMetricReader({
  exportIntervalMillis: 60000,
  exportTimeoutMillis: 30000,
  exporter: new OTLPGrpcMetricExporter()
});

const traceExporter = new OTLPGrpcTraceExporter();

const sdk = new NodeSDK({
  instrumentations: [
    getNodeAutoInstrumentations(),
    new RuntimeNodeInstrumentation({
      enabled: true,
      monitoringPrecision: 10000 // 10 seconds
    })
  ],
  metricReader: metricReader,
  resource,
  traceExporter: traceExporter
});
sdk.start();
