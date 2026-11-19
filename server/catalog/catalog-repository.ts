import {
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
  type Dirent,
} from 'node:fs';
import path from 'node:path';

import type {
  Catalog,
  CatalogItemSummary,
  CatalogResponse,
  Item,
  ItemDetails,
  Money,
} from '../../src/types/catalog.js';
import { CatalogLoadError } from './catalog-errors.js';
import { parseCatalogJson } from './catalog-validator.js';

const BYTES_PER_MEBIBYTE = 1_048_576;
const GALLERY_FILE_NAME_PATTERN = /^(0|[1-9][0-9]*)\.webp$/u;
const MAXIMUM_GALLERY_IMAGES = 50;
const MAXIMUM_IMAGE_FILE_SIZE_MEBIBYTES = 5;
const MAXIMUM_IMAGE_FILE_SIZE_BYTES =
  MAXIMUM_IMAGE_FILE_SIZE_MEBIBYTES * BYTES_PER_MEBIBYTE;
const MEDIA_ROUTE_PREFIX = '/media/items';
const PREVIEW_IMAGE_ORDINAL = 0;
const REQUIRED_WEBP_HEADER_LENGTH = 12;
const RIFF_HEADER = 'RIFF';
const WEBP_HEADER_OFFSET = 8;
const WEBP_HEADER = 'WEBP';

interface ImageRecord {
  readonly fileName: string;
  readonly filePath: string;
  readonly ordinal: number;
  readonly publicUrl: string;
}

interface ItemImageManifest {
  readonly gallery: readonly ImageRecord[];
  readonly imagesByFileName: ReadonlyMap<string, ImageRecord>;
  readonly preview: ImageRecord;
}

export interface CatalogRepositoryResultSuccess {
  readonly ok: true;
  readonly repository: CatalogRepository;
}

export interface CatalogRepositoryResultFailure {
  readonly ok: false;
  readonly error: CatalogLoadError;
}

export type CatalogRepositoryResult =
  CatalogRepositoryResultSuccess | CatalogRepositoryResultFailure;

function copyMoney(money: Money): Money {
  return {
    amountMinor: money.amountMinor,
    currency: money.currency,
  };
}

function getImageOrdinal(fileName: string): number {
  const ordinalText: string = fileName.slice(0, -'.webp'.length);

  return Number(ordinalText);
}

function assertPathInsideRoot(filePath: string, rootPath: string): void {
  const rootPrefix: string = `${rootPath}${path.sep}`;

  if (!filePath.startsWith(rootPrefix)) {
    throw new CatalogLoadError(
      'Gallery path resolves outside the configured root',
    );
  }
}

function assertWebpFile(filePath: string): void {
  const fileStats = statSync(filePath);

  if (!fileStats.isFile()) {
    throw new CatalogLoadError('Gallery entry is not a regular file');
  }

  if (fileStats.size > MAXIMUM_IMAGE_FILE_SIZE_BYTES) {
    throw new CatalogLoadError('Gallery image exceeds the maximum file size');
  }

  const imageData: Buffer = readFileSync(filePath);
  const hasRequiredLength: boolean =
    imageData.length >= REQUIRED_WEBP_HEADER_LENGTH;
  const hasRiffHeader: boolean =
    imageData.toString('ascii', 0, RIFF_HEADER.length) === RIFF_HEADER;
  const hasWebpHeader: boolean =
    imageData.toString(
      'ascii',
      WEBP_HEADER_OFFSET,
      REQUIRED_WEBP_HEADER_LENGTH,
    ) === WEBP_HEADER;

  if (!hasRequiredLength || !hasRiffHeader || !hasWebpHeader) {
    throw new CatalogLoadError('Gallery image has an invalid WebP signature');
  }
}

function createImageRecord(
  item: Item,
  itemDirectoryPath: string,
  fileName: string,
): ImageRecord {
  const filePath: string = realpathSync(
    path.resolve(itemDirectoryPath, fileName),
  );

  assertPathInsideRoot(filePath, itemDirectoryPath);
  assertWebpFile(filePath);

  return {
    fileName,
    filePath,
    ordinal: getImageOrdinal(fileName),
    publicUrl: `${MEDIA_ROUTE_PREFIX}/${encodeURIComponent(item.id)}/${fileName}`,
  };
}

function assertContiguousOrdinals(images: readonly ImageRecord[]): void {
  images.forEach((image: ImageRecord, expectedOrdinal: number): void => {
    if (image.ordinal !== expectedOrdinal) {
      throw new CatalogLoadError(
        'Gallery image ordinals must be contiguous and start at zero',
      );
    }
  });
}

function createItemImageManifest(
  item: Item,
  resolvedGalleryRootPath: string,
): ItemImageManifest {
  const itemDirectoryPath: string = realpathSync(
    path.resolve(resolvedGalleryRootPath, item.assetKey),
  );

  assertPathInsideRoot(itemDirectoryPath, resolvedGalleryRootPath);

  const entries: Dirent[] = readdirSync(itemDirectoryPath, {
    withFileTypes: true,
  });
  const invalidEntry: Dirent | undefined = entries.find(
    (entry: Dirent): boolean =>
      !entry.isFile() || !GALLERY_FILE_NAME_PATTERN.test(entry.name),
  );

  if (invalidEntry !== undefined) {
    throw new CatalogLoadError('Gallery contains an unsupported entry');
  }

  if (entries.length > MAXIMUM_GALLERY_IMAGES) {
    throw new CatalogLoadError('Gallery exceeds the maximum image count');
  }

  const images: ImageRecord[] = entries
    .map((entry: Dirent): ImageRecord =>
      createImageRecord(item, itemDirectoryPath, entry.name),
    )
    .sort(
      (first: ImageRecord, second: ImageRecord): number =>
        first.ordinal - second.ordinal,
    );

  assertContiguousOrdinals(images);

  const preview: ImageRecord | undefined = images.find(
    (image: ImageRecord): boolean => image.ordinal === PREVIEW_IMAGE_ORDINAL,
  );

  if (preview === undefined) {
    throw new CatalogLoadError('Gallery preview image is missing');
  }

  return {
    preview,
    gallery: images.filter(
      (image: ImageRecord): boolean => image.ordinal !== PREVIEW_IMAGE_ORDINAL,
    ),
    imagesByFileName: new Map<string, ImageRecord>(
      images.map((image: ImageRecord): [string, ImageRecord] => [
        image.fileName,
        image,
      ]),
    ),
  };
}

export class CatalogRepository {
  readonly #items: readonly Item[];
  readonly #itemsById: ReadonlyMap<string, Item>;
  readonly #manifestsByItemId: ReadonlyMap<string, ItemImageManifest>;

  public constructor(catalog: Catalog, galleryRootPath: string) {
    const resolvedGalleryRootPath: string = realpathSync(galleryRootPath);
    const itemsById = new Map<string, Item>();
    const manifestsByItemId = new Map<string, ItemImageManifest>();

    catalog.items.forEach((item: Item): void => {
      itemsById.set(item.id, item);
      manifestsByItemId.set(
        item.id,
        createItemImageManifest(item, resolvedGalleryRootPath),
      );
    });

    this.#items = catalog.items;
    this.#itemsById = itemsById;
    this.#manifestsByItemId = manifestsByItemId;
  }

  public getCatalog(): CatalogResponse {
    const items: CatalogItemSummary[] = this.#items.map(
      (item: Item): CatalogItemSummary => {
        const manifest: ItemImageManifest = this.getRequiredManifest(item.id);

        return {
          id: item.id,
          name: item.name,
          price: copyMoney(item.price),
          paintedAt: item.paintedAt,
          previewUrl: manifest.preview.publicUrl,
        };
      },
    );

    return { items };
  }

  public getItem(itemId: string): ItemDetails | null {
    const item: Item | undefined = this.#itemsById.get(itemId);

    if (item === undefined) {
      return null;
    }

    const manifest: ItemImageManifest = this.getRequiredManifest(itemId);

    return {
      id: item.id,
      name: item.name,
      price: copyMoney(item.price),
      description: item.description,
      paintedAt: item.paintedAt,
      previewUrl: manifest.preview.publicUrl,
      galleryUrls: manifest.gallery.map(
        (image: ImageRecord): string => image.publicUrl,
      ),
    };
  }

  public getImageFilePath(itemId: string, fileName: string): string | null {
    const manifest: ItemImageManifest | undefined =
      this.#manifestsByItemId.get(itemId);

    if (manifest === undefined) {
      return null;
    }

    return manifest.imagesByFileName.get(fileName)?.filePath ?? null;
  }

  private getRequiredManifest(itemId: string): ItemImageManifest {
    const manifest: ItemImageManifest | undefined =
      this.#manifestsByItemId.get(itemId);

    if (manifest === undefined) {
      throw new CatalogLoadError(
        'Validated item is missing its image manifest',
      );
    }

    return manifest;
  }
}

export function loadCatalogRepository(
  catalogFilePath: string,
  galleryRootPath: string,
): CatalogRepositoryResult {
  try {
    const rawCatalog: string = readFileSync(catalogFilePath, 'utf8');
    const catalog: Catalog = parseCatalogJson(rawCatalog);
    const repository = new CatalogRepository(catalog, galleryRootPath);

    return { ok: true, repository };
  } catch (error: unknown) {
    const catalogError = new CatalogLoadError('Catalog could not be loaded', {
      cause: error,
    });

    return { ok: false, error: catalogError };
  }
}
