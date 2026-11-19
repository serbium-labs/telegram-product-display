import { z } from 'zod';

import type {
  CatalogItemSummary,
  CatalogResponse,
  ItemDetails,
  Money,
  PurchaseIntentResponse,
} from './catalog';

const ITEM_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const MAXIMUM_DESCRIPTION_LENGTH = 2_000;
const MAXIMUM_ID_LENGTH = 80;
const MAXIMUM_ITEM_NAME_LENGTH = 120;
const MAXIMUM_MONEY_AMOUNT_MINOR = Number.MAX_SAFE_INTEGER;
const MAXIMUM_SUPPORTED_UNIX_TIMESTAMP_SECONDS = 253_402_300_799;
const MEDIA_URL_PATTERN =
  /^\/media\/items\/[a-z0-9]+(?:-[a-z0-9]+)*\/[0-9]+\.webp$/u;
const MINIMUM_DESCRIPTION_LENGTH = 1;
const MINIMUM_ID_LENGTH = 1;
const MINIMUM_ITEM_NAME_LENGTH = 1;
const MINIMUM_TIMESTAMP_SECONDS = 1;
const TELEGRAM_URL_PATTERN = /^https:\/\/t\.me\/[A-Za-z0-9_]{5,32}\?text=.+$/u;

export const moneySchema: z.ZodType<Money> = z.strictObject({
  amountMinor: z.number().int().nonnegative().max(MAXIMUM_MONEY_AMOUNT_MINOR),
  currency: z.literal('RUB'),
});

export const catalogItemSummarySchema: z.ZodType<CatalogItemSummary> =
  z.strictObject({
    id: z
      .string()
      .min(MINIMUM_ID_LENGTH)
      .max(MAXIMUM_ID_LENGTH)
      .regex(ITEM_ID_PATTERN),
    name: z
      .string()
      .trim()
      .min(MINIMUM_ITEM_NAME_LENGTH)
      .max(MAXIMUM_ITEM_NAME_LENGTH),
    price: moneySchema,
    paintedAt: z
      .number()
      .int()
      .min(MINIMUM_TIMESTAMP_SECONDS)
      .max(MAXIMUM_SUPPORTED_UNIX_TIMESTAMP_SECONDS),
    previewUrl: z.string().regex(MEDIA_URL_PATTERN),
  });

export const catalogResponseSchema: z.ZodType<CatalogResponse> = z.strictObject(
  {
    items: z.array(catalogItemSummarySchema),
  },
);

export const itemDetailsSchema: z.ZodType<ItemDetails> = z.strictObject({
  id: z
    .string()
    .min(MINIMUM_ID_LENGTH)
    .max(MAXIMUM_ID_LENGTH)
    .regex(ITEM_ID_PATTERN),
  name: z
    .string()
    .trim()
    .min(MINIMUM_ITEM_NAME_LENGTH)
    .max(MAXIMUM_ITEM_NAME_LENGTH),
  price: moneySchema,
  description: z
    .string()
    .trim()
    .min(MINIMUM_DESCRIPTION_LENGTH)
    .max(MAXIMUM_DESCRIPTION_LENGTH),
  paintedAt: z
    .number()
    .int()
    .min(MINIMUM_TIMESTAMP_SECONDS)
    .max(MAXIMUM_SUPPORTED_UNIX_TIMESTAMP_SECONDS),
  previewUrl: z.string().regex(MEDIA_URL_PATTERN),
  galleryUrls: z.array(z.string().regex(MEDIA_URL_PATTERN)),
});

export const purchaseIntentResponseSchema: z.ZodType<PurchaseIntentResponse> =
  z.strictObject({
    telegramUrl: z.string().regex(TELEGRAM_URL_PATTERN),
  });
