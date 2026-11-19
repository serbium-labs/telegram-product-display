import path from 'node:path';

const DEFAULT_CATALOG_FILE_PATH = 'data/catalog.json';
const DEFAULT_GALLERY_ROOT_PATH = 'data/gallery';
const DEFAULT_PORT = 3000;
const MAXIMUM_PORT = 65_535;
const MINIMUM_PORT = 1;
const DEFAULT_INIT_DATA_MAX_AGE_SECONDS = 3_600;
const MAXIMUM_INIT_DATA_MAX_AGE_SECONDS = 86_400;
const MINIMUM_INIT_DATA_MAX_AGE_SECONDS = 60;
const PRODUCTION_ENVIRONMENT = 'production';
const TELEGRAM_USERNAME_PATTERN = /^[A-Za-z0-9_]{5,32}$/u;

export interface CatalogPaths {
  readonly catalogFilePath: string;
  readonly galleryRootPath: string;
}

export interface PurchaseConfiguration {
  readonly botToken: string;
  readonly initDataMaxAgeSeconds: number;
  readonly publicAppUrl: URL;
  readonly targetUsername: string;
}

function parseInitDataMaxAge(rawValue: string | undefined): number {
  if (rawValue === undefined) {
    return DEFAULT_INIT_DATA_MAX_AGE_SECONDS;
  }

  const value: number = Number(rawValue);
  const isValid: boolean =
    Number.isInteger(value) &&
    value >= MINIMUM_INIT_DATA_MAX_AGE_SECONDS &&
    value <= MAXIMUM_INIT_DATA_MAX_AGE_SECONDS;

  if (!isValid) {
    throw new Error(
      'TELEGRAM_INIT_DATA_MAX_AGE_SECONDS must be an integer between 60 and 86400',
    );
  }

  return value;
}

function parsePublicAppUrl(rawValue: string): URL {
  const value: URL = new URL(rawValue);
  const hasSupportedProtocol: boolean =
    value.protocol === 'http:' || value.protocol === 'https:';

  if (!hasSupportedProtocol || value.username !== '' || value.password !== '') {
    throw new Error(
      'PUBLIC_APP_URL must be an HTTP(S) URL without credentials',
    );
  }

  if (
    process.env.NODE_ENV === PRODUCTION_ENVIRONMENT &&
    value.protocol !== 'https:'
  ) {
    throw new Error('PUBLIC_APP_URL must use HTTPS in production');
  }

  return value;
}

export function resolvePurchaseConfiguration(): PurchaseConfiguration | null {
  const botToken: string | undefined = process.env.TELEGRAM_BOT_TOKEN;
  const targetUsername: string | undefined =
    process.env.TELEGRAM_TARGET_USERNAME;
  const publicAppUrl: string | undefined = process.env.PUBLIC_APP_URL;
  const configuredValues: readonly (string | undefined)[] = [
    botToken,
    targetUsername,
    publicAppUrl,
  ];
  const hasAnyValue: boolean = configuredValues.some(
    (value: string | undefined): boolean => value !== undefined && value !== '',
  );
  if (!hasAnyValue) {
    return null;
  }

  const hasMissingValue: boolean =
    botToken === undefined ||
    botToken === '' ||
    targetUsername === undefined ||
    targetUsername === '' ||
    publicAppUrl === undefined ||
    publicAppUrl === '';

  if (hasMissingValue) {
    throw new Error(
      'TELEGRAM_BOT_TOKEN, TELEGRAM_TARGET_USERNAME, and PUBLIC_APP_URL must be configured together',
    );
  }

  const resolvedBotToken: string = botToken ?? '';
  const resolvedTargetUsername: string = targetUsername ?? '';
  const resolvedPublicAppUrl: string = publicAppUrl ?? '';

  if (!TELEGRAM_USERNAME_PATTERN.test(resolvedTargetUsername)) {
    throw new Error('TELEGRAM_TARGET_USERNAME has an invalid format');
  }

  return {
    botToken: resolvedBotToken,
    targetUsername: resolvedTargetUsername,
    publicAppUrl: parsePublicAppUrl(resolvedPublicAppUrl),
    initDataMaxAgeSeconds: parseInitDataMaxAge(
      process.env.TELEGRAM_INIT_DATA_MAX_AGE_SECONDS,
    ),
  };
}

export function resolveCatalogPaths(): CatalogPaths {
  const catalogFilePath: string = path.resolve(
    process.cwd(),
    process.env.CATALOG_FILE_PATH ?? DEFAULT_CATALOG_FILE_PATH,
  );
  const galleryRootPath: string = path.resolve(
    process.cwd(),
    process.env.GALLERY_ROOT_PATH ?? DEFAULT_GALLERY_ROOT_PATH,
  );

  return { catalogFilePath, galleryRootPath };
}

export function resolvePort(rawPort: string | undefined): number {
  if (rawPort === undefined) {
    return DEFAULT_PORT;
  }

  const port: number = Number(rawPort);
  const isValidPort: boolean =
    Number.isInteger(port) && port >= MINIMUM_PORT && port <= MAXIMUM_PORT;

  if (!isValidPort) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  return port;
}
