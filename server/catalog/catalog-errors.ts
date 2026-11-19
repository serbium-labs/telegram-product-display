export class CatalogValidationError extends Error {
  public constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'CatalogValidationError';
  }
}

export class CatalogLoadError extends Error {
  public constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'CatalogLoadError';
  }
}
