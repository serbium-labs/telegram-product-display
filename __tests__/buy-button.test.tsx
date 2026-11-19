import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BuyButton } from '../src/components/BuyButton';

const ITEM_ID = 'forest-view';
const TELEGRAM_URL = 'https://t.me/sample_shop?text=Purchase';

function setTelegramWebApp(webApp: TelegramWebApp | undefined): void {
  Object.defineProperty(window, 'Telegram', {
    configurable: true,
    value: webApp === undefined ? undefined : { WebApp: webApp },
  });
}

describe('BuyButton', (): void => {
  afterEach((): void => {
    setTelegramWebApp(undefined);
  });

  it('creates an intent and opens the returned Telegram link', async (): Promise<void> => {
    const openTelegramLink = vi.fn<(url: string) => void>();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ telegramUrl: TELEGRAM_URL }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    setTelegramWebApp({ initData: 'signed-init-data', openTelegramLink });
    render(<BuyButton itemId={ITEM_ID} />);

    fireEvent.click(screen.getByRole('button', { name: 'Buy' }));

    await waitFor((): void => {
      expect(openTelegramLink).toHaveBeenCalledWith(TELEGRAM_URL);
    });

    const requestOptions: RequestInit | undefined =
      fetchMock.mock.calls[0]?.[1];

    expect(requestOptions?.body).toBe(JSON.stringify({ itemId: ITEM_ID }));
  });

  it('explains that Telegram is required outside the host app', (): void => {
    setTelegramWebApp(undefined);
    render(<BuyButton itemId={ITEM_ID} />);

    fireEvent.click(screen.getByRole('button', { name: 'Buy' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Open this app in Telegram to buy this item.',
    );
  });
});
