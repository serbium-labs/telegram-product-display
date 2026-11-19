import { useEffect, useState } from 'react';

import type { CatalogItemSummary, CatalogResponse } from '../types/catalog';
import { fetchCatalog } from '../utils/catalog-api';

export interface CatalogLoadingState {
  readonly status: 'loading';
}

export interface CatalogErrorState {
  readonly status: 'error';
}

export interface CatalogEmptyState {
  readonly status: 'empty';
}

export interface CatalogSuccessState {
  readonly status: 'success';
  readonly items: readonly CatalogItemSummary[];
}

export type CatalogState =
  | CatalogLoadingState
  | CatalogErrorState
  | CatalogEmptyState
  | CatalogSuccessState;

const INITIAL_CATALOG_STATE: CatalogLoadingState = { status: 'loading' };

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function resolveLoadedState(
  catalog: CatalogResponse,
): CatalogEmptyState | CatalogSuccessState {
  if (catalog.items.length === 0) {
    return { status: 'empty' };
  }

  return { status: 'success', items: catalog.items };
}

export function useCatalog(): CatalogState {
  const [state, setState] = useState<CatalogState>(INITIAL_CATALOG_STATE);

  useEffect((): (() => void) => {
    const abortController = new AbortController();

    async function loadCatalog(): Promise<void> {
      try {
        const catalog: CatalogResponse = await fetchCatalog(
          abortController.signal,
        );

        setState(resolveLoadedState(catalog));
      } catch (error: unknown) {
        if (isAbortError(error)) {
          return;
        }

        setState({ status: 'error' });
      }
    }

    void loadCatalog();

    return (): void => {
      abortController.abort();
    };
  }, []);

  return state;
}
