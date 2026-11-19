import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from '../src/components/App';
import { ProductCard } from '../src/components/ProductCard';
import type { CatalogItemSummary, ItemDetails } from '../src/types/catalog';

const SAMPLE_ITEM: CatalogItemSummary = {
  id: 'forest-thicket',
  name: 'Forest Thicket',
  price: {
    amountMinor: 2_000_000,
    currency: 'RUB',
  },
  paintedAt: 1_704_067_200,
  previewUrl: '/media/items/forest-thicket/0.webp',
};
const OCEAN_ITEM_DETAILS: ItemDetails = {
  id: 'ocean-view',
  name: 'Ocean View',
  price: {
    amountMinor: 2_750_000,
    currency: 'RUB',
  },
  description: 'An abstract ocean composition with a calm, open atmosphere.',
  paintedAt: 1_717_200_000,
  previewUrl: '/media/items/ocean-view/0.webp',
  galleryUrls: [
    '/media/items/ocean-view/1.webp',
    '/media/items/ocean-view/2.webp',
  ],
};

function createJsonResponse(responseBody: unknown): Response {
  return new Response(JSON.stringify(responseBody), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

function installFetchMock(): ReturnType<typeof vi.fn<typeof fetch>> {
  const fetchMock = vi.fn<typeof fetch>();

  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
}

function renderWithRouter(
  element: ReactElement,
  initialEntries: string[] = ['/'],
): void {
  render(
    <MemoryRouter initialEntries={initialEntries}>{element}</MemoryRouter>,
  );
}

afterEach((): void => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('catalog experience', (): void => {
  it('renders a linked product card with preview, name, and formatted price', (): void => {
    renderWithRouter(<ProductCard item={SAMPLE_ITEM} />);

    expect(screen.getByRole('img', { name: 'Forest Thicket' })).toHaveAttribute(
      'src',
      SAMPLE_ITEM.previewUrl,
    );
    expect(
      screen.getByRole('heading', { name: 'Forest Thicket' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/20\s*000\s*₽/u)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Forest Thicket/u }),
    ).toHaveAttribute('href', '/item/forest-thicket');
  });

  it('renders Skeleton placeholders while the catalog is loading', (): void => {
    const fetchMock = installFetchMock();
    const pendingResponse = new Promise<Response>((): undefined => undefined);

    fetchMock.mockReturnValue(pendingResponse);
    renderWithRouter(<App />);

    expect(
      screen.getByRole('status', { name: 'Loading catalog' }),
    ).toHaveAttribute('aria-busy', 'true');
  });

  it('renders the empty state when the catalog has no items', async (): Promise<void> => {
    const fetchMock = installFetchMock();

    fetchMock.mockResolvedValue(createJsonResponse({ items: [] }));
    renderWithRouter(<App />);

    expect(
      await screen.findByRole('heading', { name: 'No items available' }),
    ).toBeInTheDocument();
  });

  it('renders an error state when the catalog request fails', async (): Promise<void> => {
    const fetchMock = installFetchMock();

    fetchMock.mockRejectedValue(new Error('Network unavailable'));
    renderWithRouter(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to load the catalog',
    );
  });

  it('combines the preview and gallery images in the item carousel', async (): Promise<void> => {
    const fetchMock = installFetchMock();

    fetchMock.mockResolvedValue(createJsonResponse(OCEAN_ITEM_DETAILS));
    renderWithRouter(<App />, ['/item/ocean-view']);

    expect(
      await screen.findByRole('img', { name: 'Ocean View — image 1 of 3' }),
    ).toHaveAttribute('src', OCEAN_ITEM_DETAILS.previewUrl);
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next image' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Next image' }));
    expect(
      screen.getByRole('img', { name: 'Ocean View — image 2 of 3' }),
    ).toHaveAttribute('src', OCEAN_ITEM_DETAILS.galleryUrls[0]);
  });
});
