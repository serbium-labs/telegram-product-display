import { purchaseIntentResponseSchema } from '../types/catalog-schema';
import type {
  PurchaseIntentRequest,
  PurchaseIntentResponse,
} from '../types/catalog';

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '/api';
const PURCHASE_INTENTS_ENDPOINT = `${API_BASE_URL}/v1/purchase-intents`;

export class PurchaseApiError extends Error {
  public constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'PurchaseApiError';
  }
}

export async function createPurchaseIntent(
  itemId: string,
  initData: string,
): Promise<PurchaseIntentResponse> {
  const requestBody: PurchaseIntentRequest = { itemId };
  const response: Response = await fetch(PURCHASE_INTENTS_ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Telegram-Init-Data': initData,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new PurchaseApiError(
      `Purchase request failed with status ${response.status}`,
    );
  }

  const responseBody: unknown = (await response.json()) as unknown;
  const validationResult = purchaseIntentResponseSchema.safeParse(responseBody);

  if (!validationResult.success) {
    throw new PurchaseApiError(
      'Purchase response does not match the expected contract',
      { cause: validationResult.error },
    );
  }

  return validationResult.data;
}
