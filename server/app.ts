import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import path from 'node:path';

import type { ApiErrorResponse } from '../src/types/catalog.js';
import { createCatalogRouter } from './catalog/catalog-router.js';
import {
  loadCatalogRepository,
  type CatalogRepositoryResult,
} from './catalog/catalog-repository.js';
import { resolveCatalogPaths, type CatalogPaths } from './config.js';
import {
  resolvePurchaseConfiguration,
  type PurchaseConfiguration,
} from './config.js';
import { createPurchaseIntentRouter } from './purchase/purchase-intent-router.js';
import { setSecurityHeaders } from './security/security-headers.js';

const API_PREFIX = '/api';
const API_STATUS_MESSAGE = 'API is running';
const BAD_REQUEST_STATUS_CODE = 400;
const CLIENT_DIST_DIRECTORY = 'dist';
const CLIENT_ENTRY_FILE = 'index.html';
const CLIENT_DIST_PATH = path.resolve(process.cwd(), CLIENT_DIST_DIRECTORY);
const INTERNAL_SERVER_ERROR_STATUS_CODE = 500;
const NOT_FOUND_STATUS_CODE = 404;
const PRODUCTION_ENVIRONMENT = 'production';

export interface AppDependencies {
  readonly catalogRepositoryResult?: CatalogRepositoryResult;
  readonly purchaseConfiguration?: PurchaseConfiguration | null;
}

function isJsonSyntaxError(error: unknown): boolean {
  if (!(error instanceof SyntaxError)) {
    return false;
  }

  if (!('status' in error)) {
    return false;
  }

  return error.status === BAD_REQUEST_STATUS_CODE;
}

function sendSafeJsonError(
  error: unknown,
  _request: Request,
  response: Response<ApiErrorResponse>,
  _next: NextFunction,
): void {
  void _next;

  if (isJsonSyntaxError(error)) {
    response
      .status(BAD_REQUEST_STATUS_CODE)
      .json({ error: 'Malformed JSON request' });

    return;
  }

  response
    .status(INTERNAL_SERVER_ERROR_STATUS_CODE)
    .json({ error: 'Internal server error' });
}

function sendClientEntry(
  _request: Request,
  response: Response,
  next: NextFunction,
): void {
  response.sendFile(
    CLIENT_ENTRY_FILE,
    { root: CLIENT_DIST_PATH },
    (error: Error | undefined): void => {
      if (error === undefined) {
        return;
      }

      next(error);
    },
  );
}

export function createApp(dependencies: AppDependencies = {}): Express {
  const app: Express = express();
  const catalogPaths: CatalogPaths = resolveCatalogPaths();
  const catalogRepositoryResult: CatalogRepositoryResult =
    dependencies.catalogRepositoryResult ??
    loadCatalogRepository(
      catalogPaths.catalogFilePath,
      catalogPaths.galleryRootPath,
    );
  const hasInjectedPurchaseConfiguration: boolean =
    Object.prototype.hasOwnProperty.call(dependencies, 'purchaseConfiguration');
  const purchaseConfiguration: PurchaseConfiguration | null =
    hasInjectedPurchaseConfiguration
      ? (dependencies.purchaseConfiguration ?? null)
      : resolvePurchaseConfiguration();

  app.disable('x-powered-by');
  app.use(setSecurityHeaders);
  app.use(express.json({ limit: '16kb' }));
  app.use(createCatalogRouter(catalogRepositoryResult));
  app.use(
    createPurchaseIntentRouter(catalogRepositoryResult, purchaseConfiguration),
  );

  app.get(
    `${API_PREFIX}/health`,
    (_request: Request, response: Response): void => {
      response.type('text/plain').send(API_STATUS_MESSAGE);
    },
  );

  app.use(API_PREFIX, (_request: Request, response: Response): void => {
    response
      .status(NOT_FOUND_STATUS_CODE)
      .json({ code: 'NOT_FOUND', message: 'API route not found' });
  });

  if (process.env.NODE_ENV === PRODUCTION_ENVIRONMENT) {
    app.use(express.static(CLIENT_DIST_PATH));
    app.get('/{*path}', sendClientEntry);
  }

  app.use(sendSafeJsonError);

  return app;
}
