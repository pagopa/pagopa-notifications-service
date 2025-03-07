import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter as OTLPGrpcTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { Resource } from "@opentelemetry/resources";
import { ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import { OTLPMetricExporter as OTLPGrpcMetricExporter } from "@opentelemetry/exporter-metrics-otlp-grpc";
import { RuntimeNodeInstrumentation } from "@opentelemetry/instrumentation-runtime-node";
import { HostMetrics } from "@opentelemetry/host-metrics";
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

const meterProvider = new MeterProvider({
  readers: [metricReader]
});

const hostMetrics = new HostMetrics({ meterProvider });
hostMetrics.start();

const sdk = new NodeSDK({
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-express": {
        enabled: true
      }
    }),
    new RuntimeNodeInstrumentation({
      enabled: true,
      monitoringPrecision: 5000 // 5 seconds
    })
  ],
  resource,
  traceExporter: new OTLPGrpcTraceExporter()
});
sdk.start();
