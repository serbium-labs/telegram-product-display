import type { ReactElement } from 'react';

import { SkeletonCard } from '../SkeletonCard';
import styles from './CatalogSkeleton.module.css';

const SKELETON_CARD_COUNT = 6;

export function CatalogSkeleton(): ReactElement {
  const skeletonCards: ReactElement[] = Array.from(
    { length: SKELETON_CARD_COUNT },
    (_value: unknown, index: number): ReactElement => (
      <li key={index}>
        <SkeletonCard />
      </li>
    ),
  );

  return (
    <section role="status" aria-label="Loading catalog" aria-busy="true">
      <span className={styles.visuallyHidden}>Loading catalog</span>
      <ul className={styles.grid}>{skeletonCards}</ul>
    </section>
  );
}
