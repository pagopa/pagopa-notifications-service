import * as opentelemetry from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";

export const opentelemetrySdk = new opentelemetry.NodeSDK({
  instrumentations: [getNodeAutoInstrumentations()],
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter()
  }),
  traceExporter: new OTLPTraceExporter()
});
