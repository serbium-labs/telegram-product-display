import { useState } from 'react';

import type { PurchaseIntentResponse } from '../types/catalog';
import { createPurchaseIntent } from '../utils/purchase-api';

export interface PurchaseIntentState {
  readonly errorMessage: string | null;
  readonly isSubmitting: boolean;
  readonly submit: () => Promise<void>;
}

const TELEGRAM_REQUIRED_MESSAGE = 'Open this app in Telegram to buy this item.';
const PURCHASE_FAILED_MESSAGE =
  'Unable to start the purchase. Please try again.';

export function usePurchaseIntent(itemId: string): PurchaseIntentState {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function submit(): Promise<void> {
    const telegramWebApp: TelegramWebApp | undefined = window.Telegram?.WebApp;

    if (telegramWebApp === undefined || telegramWebApp.initData === '') {
      setErrorMessage(TELEGRAM_REQUIRED_MESSAGE);

      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const purchaseIntent: PurchaseIntentResponse = await createPurchaseIntent(
        itemId,
        telegramWebApp.initData,
      );

      telegramWebApp.openTelegramLink(purchaseIntent.telegramUrl);
    } catch {
      setErrorMessage(PURCHASE_FAILED_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  }

  return { errorMessage, isSubmitting, submit };
}
