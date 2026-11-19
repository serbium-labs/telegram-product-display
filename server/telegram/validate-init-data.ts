import { createHmac, timingSafeEqual } from 'node:crypto';

import { z } from 'zod';

const AUTH_DATE_FIELD = 'auth_date';
const HASH_FIELD = 'hash';
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const MAXIMUM_FUTURE_CLOCK_SKEW_SECONDS = 30;
const MAXIMUM_INIT_DATA_LENGTH = 8_192;
const MINIMUM_AUTH_DATE_SECONDS = 1;
const MILLISECONDS_PER_SECOND = 1_000;
const TELEGRAM_SECRET_KEY = 'WebAppData';
const USER_FIELD = 'user';

const telegramUserSchema = z
  .object({
    id: z.number().int().positive().safe(),
  })
  .passthrough();

export interface ValidatedTelegramUser {
  readonly id: string;
}

function hasDuplicateKeys(parameters: URLSearchParams): boolean {
  const keys: string[] = [...parameters.keys()];

  return new Set(keys).size !== keys.length;
}

function createDataCheckString(parameters: URLSearchParams): string {
  return [...parameters.entries()]
    .filter(([key]: [string, string]): boolean => key !== HASH_FIELD)
    .sort(
      ([firstKey]: [string, string], [secondKey]: [string, string]): number =>
        firstKey.localeCompare(secondKey),
    )
    .map(([key, value]: [string, string]): string => `${key}=${value}`)
    .join('\n');
}

function hasValidSignature(
  parameters: URLSearchParams,
  botToken: string,
): boolean {
  const receivedHash: string | null = parameters.get(HASH_FIELD);

  if (receivedHash === null || !HASH_PATTERN.test(receivedHash)) {
    return false;
  }

  const secretKey: Buffer = createHmac('sha256', TELEGRAM_SECRET_KEY)
    .update(botToken)
    .digest();
  const calculatedHash: Buffer = createHmac('sha256', secretKey)
    .update(createDataCheckString(parameters))
    .digest();
  const receivedHashBuffer: Buffer = Buffer.from(receivedHash, 'hex');

  return timingSafeEqual(calculatedHash, receivedHashBuffer);
}

function hasValidAuthDate(
  rawAuthDate: string | null,
  currentTimeSeconds: number,
  maximumAgeSeconds: number,
): boolean {
  if (rawAuthDate === null || !/^\d+$/u.test(rawAuthDate)) {
    return false;
  }

  const authDate: number = Number(rawAuthDate);
  const earliestAllowedDate: number = currentTimeSeconds - maximumAgeSeconds;
  const latestAllowedDate: number =
    currentTimeSeconds + MAXIMUM_FUTURE_CLOCK_SKEW_SECONDS;

  return (
    Number.isSafeInteger(authDate) &&
    authDate >= MINIMUM_AUTH_DATE_SECONDS &&
    authDate >= earliestAllowedDate &&
    authDate <= latestAllowedDate
  );
}

export function validateTelegramInitData(
  rawInitData: string,
  botToken: string,
  maximumAgeSeconds: number,
  currentTimeMilliseconds: number = Date.now(),
): ValidatedTelegramUser | null {
  if (
    rawInitData.length === 0 ||
    rawInitData.length > MAXIMUM_INIT_DATA_LENGTH
  ) {
    return null;
  }

  const parameters = new URLSearchParams(rawInitData);

  if (
    hasDuplicateKeys(parameters) ||
    !hasValidSignature(parameters, botToken)
  ) {
    return null;
  }

  const currentTimeSeconds: number = Math.floor(
    currentTimeMilliseconds / MILLISECONDS_PER_SECOND,
  );

  if (
    !hasValidAuthDate(
      parameters.get(AUTH_DATE_FIELD),
      currentTimeSeconds,
      maximumAgeSeconds,
    )
  ) {
    return null;
  }

  const rawUser: string | null = parameters.get(USER_FIELD);

  if (rawUser === null) {
    return null;
  }

  try {
    const user: z.infer<typeof telegramUserSchema> = telegramUserSchema.parse(
      JSON.parse(rawUser) as unknown,
    );

    return { id: String(user.id) };
  } catch {
    return null;
  }
}
