import { z } from 'zod';

import type { Catalog, Item, Money } from '../../src/types/catalog.js';
import { CatalogValidationError } from './catalog-errors.js';

const ASSET_KEY_PATTERN = /^[A-Za-z0-9]+$/u;
const ITEM_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const MAXIMUM_CATALOG_ITEMS = 1_000;
const MAXIMUM_DESCRIPTION_LENGTH = 2_000;
const MAXIMUM_ID_LENGTH = 80;
const MAXIMUM_ITEM_NAME_LENGTH = 120;
const MAXIMUM_MONEY_AMOUNT_MINOR = Number.MAX_SAFE_INTEGER;
const MAXIMUM_SUPPORTED_UNIX_TIMESTAMP_SECONDS = 253_402_300_799;
const MINIMUM_CATALOG_ITEMS = 0;
const MINIMUM_DESCRIPTION_LENGTH = 1;
const MINIMUM_ID_LENGTH = 1;
const MINIMUM_ITEM_NAME_LENGTH = 1;
const MINIMUM_TIMESTAMP_SECONDS = 1;

const moneySchema: z.ZodType<Money> = z.strictObject({
  amountMinor: z.number().int().nonnegative().max(MAXIMUM_MONEY_AMOUNT_MINOR),
  currency: z.literal('RUB'),
});

const itemSchema: z.ZodType<Item> = z.strictObject({
  id: z
    .string()
    .trim()
    .min(MINIMUM_ID_LENGTH)
    .max(MAXIMUM_ID_LENGTH)
    .regex(
      ITEM_ID_PATTERN,
      'id must use lowercase letters, digits, and single hyphens',
    ),
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
  assetKey: z
    .string()
    .min(MINIMUM_ID_LENGTH)
    .max(MAXIMUM_ID_LENGTH)
    .regex(
      ASSET_KEY_PATTERN,
      'assetKey must contain only ASCII letters and digits',
    ),
});

const catalogItemsSchema: z.ZodType<Item[]> = z
  .array(itemSchema)
  .min(MINIMUM_CATALOG_ITEMS)
  .max(MAXIMUM_CATALOG_ITEMS)
  .superRefine((items: Item[], context: z.RefinementCtx): void => {
    const assetKeys = new Set<string>();
    const itemIds = new Set<string>();

    items.forEach((item: Item, index: number): void => {
      if (itemIds.has(item.id)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate item id: ${item.id}`,
          path: [index, 'id'],
        });
      }

      if (assetKeys.has(item.assetKey)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate assetKey: ${item.assetKey}`,
          path: [index, 'assetKey'],
        });
      }

      itemIds.add(item.id);
      assetKeys.add(item.assetKey);
    });
  });

function formatValidationIssues(error: z.ZodError): string {
  return error.issues
    .map((issue: z.ZodIssue): string => {
      const path: string = issue.path.join('.');
      const issueLocation: string = path.length > 0 ? path : 'catalog';

      return `${issueLocation}: ${issue.message}`;
    })
    .join('; ');
}

export function validateCatalog(value: unknown): Catalog {
  const result: z.ZodSafeParseResult<Item[]> =
    catalogItemsSchema.safeParse(value);

  if (!result.success) {
    throw new CatalogValidationError(formatValidationIssues(result.error));
  }

  return { items: result.data };
}

export function parseCatalogJson(rawCatalog: string): Catalog {
  let parsedCatalog: unknown;

  try {
    parsedCatalog = JSON.parse(rawCatalog) as unknown;
  } catch (error: unknown) {
    throw new CatalogValidationError('Catalog file contains invalid JSON', {
      cause: error,
    });
  }

  return validateCatalog(parsedCatalog);
}
