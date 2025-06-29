/**
 * Config module
 *
 * Single point of access for the application configuration. Handles validation on required environment variables.
 * The configuration is evaluate eagerly at the first access to the module. The module exposes convenient methods to access such value.
 */
import * as dotenv from "dotenv";
import * as E from "fp-ts/lib/Either";
import * as t from "io-ts";
import { readableReport } from "@pagopa/ts-commons/lib/reporters";
import { pipe } from "fp-ts/lib/function";
import { enumType } from "@pagopa/ts-commons/lib/types";

dotenv.config();

export const NotificationsServiceClientConfig = t.interface({
  TEMPLATE_IDS: t.array(t.string)
});
export type NotificationsServiceClientConfig = t.TypeOf<
  typeof NotificationsServiceClientConfig
>;
export enum NotificationsServiceClientEnum {
  "CLIENT_PAYMENT_MANAGER" = "CLIENT_PAYMENT_MANAGER",
  "CLIENT_ECOMMERCE" = "CLIENT_ECOMMERCE",
  "CLIENT_ECOMMERCE_TEST" = "CLIENT_ECOMMERCE_TEST"
}

export type NotificationsServiceClientType = t.TypeOf<
  typeof NotificationsServiceClientType
>;
export const NotificationsServiceClientType = enumType<
  NotificationsServiceClientEnum
>(NotificationsServiceClientEnum, "NotificationsServiceClientType");

// global app configuration
export type IConfig = t.TypeOf<typeof IConfig>;
export const IConfig = t.interface({
  AI_ENABLED: t.boolean,
  AI_SAMPLING_PERCENTAGE: t.number,
  AWS_SES_ACCESS_KEY_ID: t.string,
  AWS_SES_ENDPOINT: t.string,
  AWS_SES_REGION: t.string,
  AWS_SES_SECRET_ACCESS_KEY: t.string,
  CLIENT_ECOMMERCE: NotificationsServiceClientConfig,
  CLIENT_ECOMMERCE_TEST: NotificationsServiceClientConfig,
  CLIENT_PAYMENT_MANAGER: NotificationsServiceClientConfig,
  ECOMMERCE_NOTIFICATIONS_SENDER: t.string,
  ERROR_QUEUE_NAME: t.string,
  INITIAL_RETRY_TIMEOUT_SECONDS: t.number,
  MAX_RETRY_ATTEMPTS: t.number,
  PAGOPA_MAIL_LOGO_URI: t.string,
  PERSONAL_DATA_VAULT_API_BASE_PATH: t.string,
  PERSONAL_DATA_VAULT_API_HOST: t.string,
  PERSONAL_DATA_VAULT_API_KEY: t.string,
  PORT: t.number,
  RETRY_QUEUE_NAME: t.string,
  SECURITY_API_KEY_PRIMARY: t.string,
  SECURITY_API_KEY_SECONDARY: t.string,
  SECURITY_API_KEY_SECURED_PATHS: t.array(t.string),
  SERVER_KEEP_ALIVE: t.number,
  STORAGE_DEADLETTER_CONNECTION_STRING: t.string,
  STORAGE_TRANSIENT_CONNECTION_STRING: t.string
});

// No need to re-evaluate this object for each call
const envConfig = {
  ...process.env,
  AI_ENABLED: process.env.AI_ENABLED
    ? process.env.AI_ENABLED === "true"
    : false,
  AI_SAMPLING_PERCENTAGE: process.env.AI_SAMPLING_PERCENTAGE
    ? parseInt(process.env.AI_SAMPLING_PERCENTAGE, 10)
    : 30,
  AWS_SES_ENDPOINT: process.env.AWS_SES_ENDPOINT
    ? process.env.AWS_SES_ENDPOINT
    : "",
  CLIENT_ECOMMERCE: JSON.parse(process.env.CLIENT_ECOMMERCE || "{}"),
  CLIENT_ECOMMERCE_TEST: JSON.parse(process.env.CLIENT_ECOMMERCE_TEST || "{}"),
  CLIENT_PAYMENT_MANAGER: JSON.parse(
    process.env.CLIENT_PAYMENT_MANAGER || "{}"
  ),
  INITIAL_RETRY_TIMEOUT_SECONDS: process.env.INITIAL_RETRY_TIMEOUT_SECONDS
    ? parseInt(process.env.INITIAL_RETRY_TIMEOUT_SECONDS, 10)
    : 120,
  MAX_RETRY_ATTEMPTS: process.env.MAX_RETRY_ATTEMPTS
    ? parseInt(process.env.MAX_RETRY_ATTEMPTS, 10)
    : 3,
  PAGOPA_MAIL_LOGO_URI: process.env.PAGOPA_MAIL_LOGO_URI
    ? process.env.PAGOPA_MAIL_LOGO_URI
    : "",
  PERSONAL_DATA_VAULT_API_BASE_PATH: process.env
    .PERSONAL_DATA_VAULT_API_BASE_PATH
    ? process.env.PERSONAL_DATA_VAULT_API_BASE_PATH
    : "",
  PERSONAL_DATA_VAULT_API_HOST: process.env.PERSONAL_DATA_VAULT_API_HOST,
  PERSONAL_DATA_VAULT_API_KEY: process.env.PERSONAL_DATA_VAULT_API_KEY,
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  SECURITY_API_KEY_PRIMARY: process.env.SECURITY_API_KEY_PRIMARY,
  SECURITY_API_KEY_SECONDARY: process.env.SECURITY_API_KEY_SECONDARY,
  SECURITY_API_KEY_SECURED_PATHS: (
    process.env.SECURITY_API_KEY_SECURED_PATHS || ""
  )
    .split(",")
    .map(s => s.trim())
    .filter(Boolean),
  SERVER_KEEP_ALIVE: process.env.SERVER_KEEP_ALIVE
    ? parseInt(process.env.SERVER_KEEP_ALIVE, 10)
    : 61000
};

// No need to re-evaluate this object for each call
const errorOrConfig: t.Validation<IConfig> = IConfig.decode(envConfig);

/**
 * Read the application configuration and check for invalid values.
 * Configuration is eagerly evalued when the application starts.
 *
 * @returns either the configuration values or a list of validation errors
 */
export const getConfig = (): t.Validation<IConfig> => errorOrConfig;

/**
 * Read the application configuration and check for invalid values.
 * If the application is not valid, raises an exception.
 *
 * @returns the configuration values
 * @throws validation errors found while parsing the application configuration
 */
export const getConfigOrThrow = (): IConfig =>
  pipe(
    errorOrConfig,
    E.getOrElseW((errors: ReadonlyArray<t.ValidationError>) => {
      throw new Error(`Invalid configuration: ${readableReport(errors)}`);
    })
  );
