import type { ReactElement } from 'react';

import styles from './SkeletonCard.module.css';

export function SkeletonCard(): ReactElement {
  return (
    <div className={styles.card} aria-hidden="true">
      <div className={`${styles.block} ${styles.image}`} />
      <div className={styles.content}>
        <div className={`${styles.block} ${styles.title}`} />
        <div className={`${styles.block} ${styles.price}`} />
      </div>
    </div>
  );
}
