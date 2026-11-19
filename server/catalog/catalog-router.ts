import { Router, type Request, type Response } from 'express';

import type {
  ApiErrorResponse,
  CatalogResponse,
  ItemDetails,
} from '../../src/types/catalog.js';
import type {
  CatalogRepository,
  CatalogRepositoryResult,
} from './catalog-repository.js';

const CATALOG_UNAVAILABLE_STATUS_CODE = 500;
const NOT_FOUND_STATUS_CODE = 404;

interface ItemRouteParameters {
  readonly id: string;
}

interface ImageRouteParameters extends ItemRouteParameters {
  readonly fileName: string;
}

function getRepository(
  repositoryResult: CatalogRepositoryResult,
  response: Response<ApiErrorResponse>,
): CatalogRepository | null {
  if (!repositoryResult.ok) {
    response
      .status(CATALOG_UNAVAILABLE_STATUS_CODE)
      .json({ error: 'Catalog is unavailable' });

    return null;
  }

  return repositoryResult.repository;
}

export function createCatalogRouter(
  repositoryResult: CatalogRepositoryResult,
): Router {
  const router: Router = Router();

  router.get(
    '/api/v1/catalog',
    (
      _request: Request,
      response: Response<CatalogResponse | ApiErrorResponse>,
    ): void => {
      const repository: CatalogRepository | null = getRepository(
        repositoryResult,
        response,
      );

      if (repository === null) {
        return;
      }

      response.json(repository.getCatalog());
    },
  );

  router.get(
    '/api/v1/items/:id',
    (
      request: Request<ItemRouteParameters>,
      response: Response<ItemDetails | ApiErrorResponse>,
    ): void => {
      const repository: CatalogRepository | null = getRepository(
        repositoryResult,
        response,
      );

      if (repository === null) {
        return;
      }

      const item: ItemDetails | null = repository.getItem(request.params.id);

      if (item === null) {
        response
          .status(NOT_FOUND_STATUS_CODE)
          .json({ error: 'Item not found' });

        return;
      }

      response.json(item);
    },
  );

  router.get(
    '/media/items/:id/:fileName',
    (
      request: Request<ImageRouteParameters>,
      response: Response<ApiErrorResponse>,
    ): void => {
      const repository: CatalogRepository | null = getRepository(
        repositoryResult,
        response,
      );

      if (repository === null) {
        return;
      }

      const imageFilePath: string | null = repository.getImageFilePath(
        request.params.id,
        request.params.fileName,
      );

      if (imageFilePath === null) {
        response
          .status(NOT_FOUND_STATUS_CODE)
          .json({ error: 'Image not found' });

        return;
      }

      response.type('image/webp').sendFile(imageFilePath);
    },
  );

  return router;
}
