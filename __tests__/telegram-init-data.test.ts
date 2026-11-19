import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { validateTelegramInitData } from '../server/telegram/validate-init-data.js';

const BOT_TOKEN = '123456:test-token';
const CURRENT_TIME_MILLISECONDS = 1_800_000_000_000;
const MILLISECONDS_PER_SECOND = 1_000;
const CURRENT_TIME_SECONDS =
  CURRENT_TIME_MILLISECONDS / MILLISECONDS_PER_SECOND;
const MAXIMUM_AGE_SECONDS = 3_600;
const STALE_AUTH_DATE_SECONDS = CURRENT_TIME_SECONDS - MAXIMUM_AGE_SECONDS - 1;
const TELEGRAM_SECRET_KEY = 'WebAppData';
const USER_ID = 42;

function createSignedInitData(authDate: number): string {
  const parameters = new URLSearchParams({
    auth_date: String(authDate),
    query_id: 'test-query',
    user: JSON.stringify({ id: USER_ID, first_name: 'Test' }),
  });
  const dataCheckString: string = [...parameters.entries()]
    .sort(
      ([firstKey]: [string, string], [secondKey]: [string, string]): number =>
        firstKey.localeCompare(secondKey),
    )
    .map(([key, value]: [string, string]): string => `${key}=${value}`)
    .join('\n');
  const secretKey: Buffer = createHmac('sha256', TELEGRAM_SECRET_KEY)
    .update(BOT_TOKEN)
    .digest();
  const hash: string = createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  parameters.set('hash', hash);

  return parameters.toString();
}

describe('Telegram initData validation', (): void => {
  it('accepts correctly signed and current data', (): void => {
    const result = validateTelegramInitData(
      createSignedInitData(CURRENT_TIME_SECONDS),
      BOT_TOKEN,
      MAXIMUM_AGE_SECONDS,
      CURRENT_TIME_MILLISECONDS,
    );

    expect(result).toEqual({ id: String(USER_ID) });
  });

  it('rejects data changed after signing', (): void => {
    const initData: string = createSignedInitData(CURRENT_TIME_SECONDS).replace(
      'test-query',
      'changed-query',
    );

    expect(
      validateTelegramInitData(
        initData,
        BOT_TOKEN,
        MAXIMUM_AGE_SECONDS,
        CURRENT_TIME_MILLISECONDS,
      ),
    ).toBeNull();
  });

  it('rejects stale signed data', (): void => {
    expect(
      validateTelegramInitData(
        createSignedInitData(STALE_AUTH_DATE_SECONDS),
        BOT_TOKEN,
        MAXIMUM_AGE_SECONDS,
        CURRENT_TIME_MILLISECONDS,
      ),
    ).toBeNull();
  });
});
