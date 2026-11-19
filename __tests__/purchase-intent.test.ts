import { createHmac } from 'node:crypto';

import request, { type Response } from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../server/app.js';
import type { PurchaseConfiguration } from '../server/config.js';
import type { PurchaseIntentResponse } from '../src/types/catalog.js';
import { formatMoney } from '../src/utils/format-money.js';

const BOT_TOKEN = '123456:test-token';
const HTTP_NOT_FOUND_STATUS = 404;
const HTTP_OK_STATUS = 200;
const HTTP_BAD_REQUEST_STATUS = 400;
const HTTP_SERVICE_UNAVAILABLE_STATUS = 503;
const HTTP_UNAUTHORIZED_STATUS = 401;
const INIT_DATA_MAX_AGE_SECONDS = 3_600;
const MILLISECONDS_PER_SECOND = 1_000;
const ITEM_ID = 'forest-thicket';
const ITEM_PRICE_AMOUNT_MINOR = 2_000_000;
const PURCHASE_ENDPOINT = '/api/v1/purchase-intents';
const TARGET_USERNAME = 'sample_shop';
const TELEGRAM_SECRET_KEY = 'WebAppData';
const USER_ID = 42;

const purchaseConfiguration: PurchaseConfiguration = {
  botToken: BOT_TOKEN,
  initDataMaxAgeSeconds: INIT_DATA_MAX_AGE_SECONDS,
  publicAppUrl: new URL('https://shop.example/'),
  targetUsername: TARGET_USERNAME,
};

function createSignedInitData(): string {
  const parameters = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / MILLISECONDS_PER_SECOND)),
    user: JSON.stringify({ id: USER_ID }),
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

describe('purchase intent API', (): void => {
  it('creates a Telegram link from canonical catalog data', async (): Promise<void> => {
    const response: Response = await request(
      createApp({ purchaseConfiguration }),
    )
      .post(PURCHASE_ENDPOINT)
      .set('X-Telegram-Init-Data', createSignedInitData())
      .send({ itemId: ITEM_ID });

    expect(response.status).toBe(HTTP_OK_STATUS);

    const responseBody: PurchaseIntentResponse =
      response.body as PurchaseIntentResponse;
    const telegramUrl: URL = new URL(responseBody.telegramUrl);
    const message: string | null = telegramUrl.searchParams.get('text');

    expect(telegramUrl.origin).toBe('https://t.me');
    expect(telegramUrl.pathname).toBe(`/${TARGET_USERNAME}`);
    expect(message).toContain('Forest Thicket');
    expect(message).toContain(
      formatMoney({ amountMinor: ITEM_PRICE_AMOUNT_MINOR, currency: 'RUB' }),
    );
    expect(message).toContain(
      'https://shop.example/media/items/forest-thicket/0.webp',
    );
  });

  it('rejects unexpected client-supplied commercial data', async (): Promise<void> => {
    const response: Response = await request(
      createApp({ purchaseConfiguration }),
    )
      .post(PURCHASE_ENDPOINT)
      .set('X-Telegram-Init-Data', createSignedInitData())
      .send({ itemId: ITEM_ID, price: 1 });

    expect(response.status).toBe(HTTP_BAD_REQUEST_STATUS);
    expect(response.body).toEqual({ error: 'Invalid purchase intent request' });
  });

  it('returns a safe JSON error for malformed JSON', async (): Promise<void> => {
    const response: Response = await request(
      createApp({ purchaseConfiguration }),
    )
      .post(PURCHASE_ENDPOINT)
      .set('Content-Type', 'application/json')
      .set('X-Telegram-Init-Data', createSignedInitData())
      .send('{invalid');

    expect(response.status).toBe(HTTP_BAD_REQUEST_STATUS);
    expect(response.body).toEqual({ error: 'Malformed JSON request' });
  });

  it('can explicitly disable the purchase service', async (): Promise<void> => {
    const response: Response = await request(
      createApp({ purchaseConfiguration: null }),
    )
      .post(PURCHASE_ENDPOINT)
      .send({ itemId: ITEM_ID });

    expect(response.status).toBe(HTTP_SERVICE_UNAVAILABLE_STATUS);
    expect(response.body).toEqual({ error: 'Purchase service is unavailable' });
  });

  it('rejects a request without valid Telegram authentication', async (): Promise<void> => {
    const response: Response = await request(
      createApp({ purchaseConfiguration }),
    )
      .post(PURCHASE_ENDPOINT)
      .send({ itemId: ITEM_ID });

    expect(response.status).toBe(HTTP_UNAUTHORIZED_STATUS);
    expect(response.body).toEqual({ error: 'Telegram authentication failed' });
  });

  it('returns JSON when the requested item does not exist', async (): Promise<void> => {
    const response: Response = await request(
      createApp({ purchaseConfiguration }),
    )
      .post(PURCHASE_ENDPOINT)
      .set('X-Telegram-Init-Data', createSignedInitData())
      .send({ itemId: 'missing-item' });

    expect(response.status).toBe(HTTP_NOT_FOUND_STATUS);
    expect(response.body).toEqual({ error: 'Item not found' });
  });
});
