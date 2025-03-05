import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import {
  PeriodicExportingMetricReader,
} from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const otlpHeaders = process.env.OTEL_EXPORTER_OTLP_HEADERS?.split("=")!;
const otelCollectorServerUri = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
const resource = Resource.default().merge(
    new Resource({
      [ATTR_SERVICE_NAME]: 'service-name-here',
      [ATTR_SERVICE_VERSION]: '0.1.0',
    }),
  );

const traceExporter = new OTLPTraceExporter({
    url: `${otelCollectorServerUri}`,
    headers: {[otlpHeaders[0]]:otlpHeaders[1]}
});
const metricExporter = new OTLPMetricExporter({
    url: `${otelCollectorServerUri}`,
    headers: {[otlpHeaders[0]]:otlpHeaders[1]}

});

const sdk = new NodeSDK({
    resource: resource,
    traceExporter: traceExporter,
    metricReader: new PeriodicExportingMetricReader({
      exporter: metricExporter,
    }),
    instrumentations: [getNodeAutoInstrumentations()],
  });
  sdk.start();