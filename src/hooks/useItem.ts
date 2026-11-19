import { useEffect, useState } from 'react';

import type { ItemDetails } from '../types/catalog';
import { CatalogApiError, fetchItem } from '../utils/catalog-api';

export interface ItemLoadingState {
  readonly status: 'loading';
}

export interface ItemErrorState {
  readonly status: 'error';
}

export interface ItemNotFoundState {
  readonly status: 'notFound';
}

export interface ItemSuccessState {
  readonly status: 'success';
  readonly item: ItemDetails;
}

export type ItemState =
  ItemLoadingState | ItemErrorState | ItemNotFoundState | ItemSuccessState;

const HTTP_NOT_FOUND_STATUS = 404;
const INITIAL_ITEM_STATE: ItemLoadingState = { status: 'loading' };

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function isNotFoundError(error: unknown): boolean {
  return (
    error instanceof CatalogApiError && error.status === HTTP_NOT_FOUND_STATUS
  );
}

export function useItem(itemId: string): ItemState {
  const [state, setState] = useState<ItemState>(INITIAL_ITEM_STATE);

  useEffect((): (() => void) => {
    const abortController = new AbortController();

    async function loadItem(): Promise<void> {
      try {
        const item: ItemDetails = await fetchItem(
          itemId,
          abortController.signal,
        );

        setState({ status: 'success', item });
      } catch (error: unknown) {
        if (isAbortError(error)) {
          return;
        }

        if (isNotFoundError(error)) {
          setState({ status: 'notFound' });

          return;
        }

        setState({ status: 'error' });
      }
    }

    void loadItem();

    return (): void => {
      abortController.abort();
    };
  }, [itemId]);

  return state;
}
