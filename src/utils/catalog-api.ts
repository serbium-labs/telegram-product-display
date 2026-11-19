import { z } from 'zod';

import {
  catalogResponseSchema,
  itemDetailsSchema,
} from '../types/catalog-schema';
import type { CatalogResponse, ItemDetails } from '../types/catalog';

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '/api';
const CATALOG_ENDPOINT = `${API_BASE_URL}/v1/catalog`;

export class CatalogApiError extends Error {
  public readonly status: number | null;

  public constructor(
    message: string,
    status: number | null,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'CatalogApiError';
    this.status = status;
  }
}

async function requestValidated<ResponseBody>(
  endpoint: string,
  responseSchema: z.ZodType<ResponseBody>,
  signal: AbortSignal,
): Promise<ResponseBody> {
  const response: Response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal,
  });

  if (!response.ok) {
    throw new CatalogApiError(
      `Request failed with status ${response.status}`,
      response.status,
    );
  }

  const responseBody: unknown = (await response.json()) as unknown;
  const validationResult: z.ZodSafeParseResult<ResponseBody> =
    responseSchema.safeParse(responseBody);

  if (!validationResult.success) {
    throw new CatalogApiError(
      'Response does not match the expected contract',
      null,
      { cause: validationResult.error },
    );
  }

  return validationResult.data;
}

export function fetchCatalog(signal: AbortSignal): Promise<CatalogResponse> {
  return requestValidated(CATALOG_ENDPOINT, catalogResponseSchema, signal);
}

export function fetchItem(
  itemId: string,
  signal: AbortSignal,
): Promise<ItemDetails> {
  const itemEndpoint = `${API_BASE_URL}/v1/items/${encodeURIComponent(itemId)}`;

  return requestValidated(itemEndpoint, itemDetailsSchema, signal);
}
