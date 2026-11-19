import { Router, type Request, type Response } from 'express';
import { z } from 'zod';

import type {
  ApiErrorResponse,
  ItemDetails,
  PurchaseIntentRequest,
  PurchaseIntentResponse,
} from '../../src/types/catalog.js';
import { formatMoney } from '../../src/utils/format-money.js';
import type { CatalogRepositoryResult } from '../catalog/catalog-repository.js';
import type { PurchaseConfiguration } from '../config.js';
import { FixedWindowRateLimiter } from '../security/fixed-window-rate-limiter.js';
import { validateTelegramInitData } from '../telegram/validate-init-data.js';

const BAD_REQUEST_STATUS_CODE = 400;
const CATALOG_UNAVAILABLE_STATUS_CODE = 503;
const ITEM_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const MAXIMUM_ID_LENGTH = 80;
const MAXIMUM_PURCHASE_REQUESTS_PER_WINDOW = 10;
const MINIMUM_ID_LENGTH = 1;
const NOT_FOUND_STATUS_CODE = 404;
const RATE_LIMIT_STATUS_CODE = 429;
const RATE_LIMIT_WINDOW_MILLISECONDS = 60_000;
const TELEGRAM_INIT_DATA_HEADER = 'x-telegram-init-data';
const TELEGRAM_LINK_ORIGIN = 'https://t.me';
const UNAUTHORIZED_STATUS_CODE = 401;

const purchaseIntentRequestSchema: z.ZodType<PurchaseIntentRequest> =
  z.strictObject({
    itemId: z
      .string()
      .min(MINIMUM_ID_LENGTH)
      .max(MAXIMUM_ID_LENGTH)
      .regex(ITEM_ID_PATTERN),
  });

function createTelegramUrl(
  item: ItemDetails,
  configuration: PurchaseConfiguration,
): string {
  const previewUrl: URL = new URL(item.previewUrl, configuration.publicAppUrl);
  const telegramUrl: URL = new URL(
    configuration.targetUsername,
    `${TELEGRAM_LINK_ORIGIN}/`,
  );
  const message: string = [
    `Item: ${item.name}`,
    `Price: ${formatMoney(item.price)}`,
    `Preview: ${previewUrl.href}`,
  ].join('\n');

  telegramUrl.searchParams.set('text', message);

  return telegramUrl.href;
}

export function createPurchaseIntentRouter(
  repositoryResult: CatalogRepositoryResult,
  configuration: PurchaseConfiguration | null,
): Router {
  const router: Router = Router();
  const rateLimiter = new FixedWindowRateLimiter(
    MAXIMUM_PURCHASE_REQUESTS_PER_WINDOW,
    RATE_LIMIT_WINDOW_MILLISECONDS,
  );

  router.post(
    '/api/v1/purchase-intents',
    (
      request: Request<unknown, unknown, unknown>,
      response: Response<PurchaseIntentResponse | ApiErrorResponse>,
    ): void => {
      if (configuration === null) {
        response
          .status(CATALOG_UNAVAILABLE_STATUS_CODE)
          .json({ error: 'Purchase service is unavailable' });

        return;
      }

      const rawInitData: string | undefined = request.get(
        TELEGRAM_INIT_DATA_HEADER,
      );
      const validatedUser =
        rawInitData === undefined
          ? null
          : validateTelegramInitData(
              rawInitData,
              configuration.botToken,
              configuration.initDataMaxAgeSeconds,
            );

      if (validatedUser === null) {
        response
          .status(UNAUTHORIZED_STATUS_CODE)
          .json({ error: 'Telegram authentication failed' });

        return;
      }

      if (!rateLimiter.consume(validatedUser.id)) {
        response
          .status(RATE_LIMIT_STATUS_CODE)
          .json({ error: 'Too many purchase requests' });

        return;
      }

      const requestValidation = purchaseIntentRequestSchema.safeParse(
        request.body,
      );

      if (!requestValidation.success) {
        response
          .status(BAD_REQUEST_STATUS_CODE)
          .json({ error: 'Invalid purchase intent request' });

        return;
      }

      if (!repositoryResult.ok) {
        response
          .status(CATALOG_UNAVAILABLE_STATUS_CODE)
          .json({ error: 'Catalog is unavailable' });

        return;
      }

      const item: ItemDetails | null = repositoryResult.repository.getItem(
        requestValidation.data.itemId,
      );

      if (item === null) {
        response
          .status(NOT_FOUND_STATUS_CODE)
          .json({ error: 'Item not found' });

        return;
      }

      response.json({ telegramUrl: createTelegramUrl(item, configuration) });
    },
  );

  return router;
}
