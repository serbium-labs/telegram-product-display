import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';

import type { CatalogItemSummary } from '../../types/catalog';
import { formatMoney } from '../../utils/format-money';
import styles from './ProductCard.module.css';

export interface ProductCardProperties {
  readonly item: CatalogItemSummary;
}

export function ProductCard({ item }: ProductCardProperties): ReactElement {
  const formattedPrice: string = formatMoney(item.price);

  return (
    <article className={styles.card}>
      <Link className={styles.link} to={`/item/${encodeURIComponent(item.id)}`}>
        <div className={styles.imageFrame}>
          <img
            className={styles.image}
            src={item.previewUrl}
            alt={item.name}
            width="1"
            height="1"
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className={styles.content}>
          <h2 className={styles.title}>{item.name}</h2>
          <p className={styles.price}>{formattedPrice}</p>
        </div>
      </Link>
    </article>
  );
}
