import request, { type Response } from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../server/app.js';
import { CatalogLoadError } from '../server/catalog/catalog-errors.js';
import type { CatalogRepositoryResult } from '../server/catalog/catalog-repository.js';
import type {
  ApiErrorResponse,
  CatalogResponse,
  ItemDetails,
} from '../src/types/catalog.js';

const HTTP_NOT_FOUND_STATUS = 404;
const HTTP_OK_STATUS = 200;
const HTTP_SERVER_ERROR_STATUS = 500;
const MOCK_CATALOG_SIZE = 2;

describe('catalog API', (): void => {
  it('returns catalog summaries without internal asset keys', async (): Promise<void> => {
    const response: Response =
      await request(createApp()).get('/api/v1/catalog');
    const responseBody = response.body as CatalogResponse;

    expect(response.status).toBe(HTTP_OK_STATUS);
    expect(responseBody.items).toHaveLength(MOCK_CATALOG_SIZE);
    expect(responseBody.items[0]).toEqual(
      expect.objectContaining({
        id: 'forest-thicket',
        previewUrl: '/media/items/forest-thicket/0.webp',
      }),
    );
    expect(responseBody.items[0]).not.toHaveProperty('assetKey');
    expect(responseBody.items[0]).not.toHaveProperty('description');
  });

  it('returns full item details and gallery URLs', async (): Promise<void> => {
    const response: Response = await request(createApp()).get(
      '/api/v1/items/forest-thicket',
    );
    const responseBody = response.body as ItemDetails;

    expect(response.status).toBe(HTTP_OK_STATUS);
    expect(responseBody).toEqual(
      expect.objectContaining({
        id: 'forest-thicket',
        description: 'A quiet forest study created with layered natural tones.',
        previewUrl: '/media/items/forest-thicket/0.webp',
        galleryUrls: [
          '/media/items/forest-thicket/1.webp',
          '/media/items/forest-thicket/2.webp',
        ],
      }),
    );
    expect(responseBody).not.toHaveProperty('assetKey');
  });

  it('returns a JSON error when an item does not exist', async (): Promise<void> => {
    const response: Response = await request(createApp()).get(
      '/api/v1/items/missing-item',
    );
    const responseBody = response.body as ApiErrorResponse;

    expect(response.status).toBe(HTTP_NOT_FOUND_STATUS);
    expect(response.type).toMatch(/json/u);
    expect(responseBody).toEqual({ error: 'Item not found' });
  });

  it('returns a safe JSON error when the catalog is unavailable', async (): Promise<void> => {
    const repositoryResult: CatalogRepositoryResult = {
      ok: false,
      error: new CatalogLoadError('Internal fixture error'),
    };
    const response: Response = await request(
      createApp({ catalogRepositoryResult: repositoryResult }),
    ).get('/api/v1/catalog');
    const responseBody = response.body as ApiErrorResponse;

    expect(response.status).toBe(HTTP_SERVER_ERROR_STATUS);
    expect(response.type).toMatch(/json/u);
    expect(responseBody).toEqual({ error: 'Catalog is unavailable' });
  });

  it('serves a validated WebP image', async (): Promise<void> => {
    const response: Response = await request(createApp()).get(
      '/media/items/ocean-view/0.webp',
    );

    expect(response.status).toBe(HTTP_OK_STATUS);
    expect(response.type).toBe('image/webp');
  });
});
