import { describe, expect, it } from 'vitest';

import { CatalogValidationError } from '../server/catalog/catalog-errors.js';
import {
  parseCatalogJson,
  validateCatalog,
} from '../server/catalog/catalog-validator.js';
import type { Item } from '../src/types/catalog.js';

const VALID_ITEM: Item = {
  id: 'sample-item',
  name: 'Sample Item',
  price: {
    amountMinor: 12500,
    currency: 'RUB',
  },
  description: 'A valid catalog item.',
  paintedAt: 1_704_067_200,
  assetKey: 'sample1',
};
const NON_INTEGER_TIMESTAMP_SECONDS = 1.5;

function createItem(overrides: Partial<Item> = {}): Item {
  return {
    ...VALID_ITEM,
    ...overrides,
    price: overrides.price ?? VALID_ITEM.price,
  };
}

describe('catalog validator', (): void => {
  it('rejects malformed JSON', (): void => {
    expect((): void => {
      parseCatalogJson('{invalid');
    }).toThrow(/invalid JSON/u);
  });

  it('accepts a valid catalog', (): void => {
    const catalog = validateCatalog([VALID_ITEM]);

    expect(catalog.items).toEqual([VALID_ITEM]);
  });

  it('accepts an empty catalog', (): void => {
    const catalog = validateCatalog([]);

    expect(catalog.items).toEqual([]);
  });

  it('rejects a missing required field', (): void => {
    const itemWithoutName: Omit<Item, 'name'> = {
      id: VALID_ITEM.id,
      price: VALID_ITEM.price,
      description: VALID_ITEM.description,
      paintedAt: VALID_ITEM.paintedAt,
      assetKey: VALID_ITEM.assetKey,
    };

    expect((): void => {
      validateCatalog([itemWithoutName]);
    }).toThrow(CatalogValidationError);
  });

  it('rejects duplicate item ids', (): void => {
    const duplicateItem: Item = createItem({
      name: 'Duplicate Item',
      assetKey: 'sample2',
    });

    expect((): void => {
      validateCatalog([VALID_ITEM, duplicateItem]);
    }).toThrow(/Duplicate item id/u);
  });

  it('rejects duplicate asset keys', (): void => {
    const duplicateAssetItem: Item = createItem({
      id: 'second-item',
      name: 'Second Item',
    });

    expect((): void => {
      validateCatalog([VALID_ITEM, duplicateAssetItem]);
    }).toThrow(/Duplicate assetKey/u);
  });

  it.each([
    'folder/name',
    'folder\\name',
    '../folder',
    'folder_name',
    'folder-name',
  ])('rejects unsafe assetKey %s', (assetKey: string): void => {
    expect((): void => {
      validateCatalog([createItem({ assetKey })]);
    }).toThrow(CatalogValidationError);
  });

  it.each([
    { amountMinor: -1, currency: 'RUB' },
    { amountMinor: 10.5, currency: 'RUB' },
    { amountMinor: 100, currency: 'USD' },
    { amountMinor: '100', currency: 'RUB' },
  ])('rejects invalid price %#', (price: unknown): void => {
    expect((): void => {
      validateCatalog([{ ...VALID_ITEM, price }]);
    }).toThrow(CatalogValidationError);
  });

  it.each([-1, NON_INTEGER_TIMESTAMP_SECONDS, '1704067200', null])(
    'rejects invalid paintedAt %s',
    (paintedAt: unknown): void => {
      expect((): void => {
        validateCatalog([{ ...VALID_ITEM, paintedAt }]);
      }).toThrow(CatalogValidationError);
    },
  );

  it('rejects unknown item fields', (): void => {
    expect((): void => {
      validateCatalog([{ ...VALID_ITEM, unexpected: true }]);
    }).toThrow(CatalogValidationError);
  });
});
