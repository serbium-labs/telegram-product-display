export type CurrencyCode = 'RUB';

export interface Money {
  readonly amountMinor: number;
  readonly currency: CurrencyCode;
}

export interface Item {
  readonly id: string;
  readonly name: string;
  readonly price: Money;
  readonly description: string;
  readonly paintedAt: number;
  readonly assetKey: string;
}

export interface Catalog {
  readonly items: readonly Item[];
}

export interface CatalogItemSummary {
  readonly id: string;
  readonly name: string;
  readonly price: Money;
  readonly paintedAt: number;
  readonly previewUrl: string;
}

export interface CatalogResponse {
  readonly items: readonly CatalogItemSummary[];
}

export interface ItemDetails {
  readonly id: string;
  readonly name: string;
  readonly price: Money;
  readonly description: string;
  readonly paintedAt: number;
  readonly previewUrl: string;
  readonly galleryUrls: readonly string[];
}

export interface ApiErrorResponse {
  readonly error: string;
}

export interface PurchaseIntentRequest {
  readonly itemId: string;
}

export interface PurchaseIntentResponse {
  readonly telegramUrl: string;
}
