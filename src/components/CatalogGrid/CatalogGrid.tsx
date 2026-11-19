import type { ReactElement } from 'react';

import type { CatalogItemSummary } from '../../types/catalog';
import { ProductCard } from '../ProductCard';
import styles from './CatalogGrid.module.css';

export interface CatalogGridProperties {
  readonly items: readonly CatalogItemSummary[];
}

export function CatalogGrid({ items }: CatalogGridProperties): ReactElement {
  return (
    <ul className={styles.grid} aria-label="Catalog items">
      {items.map((item: CatalogItemSummary): ReactElement => (
        <li className={styles.item} key={item.id}>
          <ProductCard item={item} />
        </li>
      ))}
    </ul>
  );
}
