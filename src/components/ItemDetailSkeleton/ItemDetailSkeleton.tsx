import type { ReactElement } from 'react';

import styles from './ItemDetailSkeleton.module.css';

export function ItemDetailSkeleton(): ReactElement {
  return (
    <section
      className={styles.layout}
      role="status"
      aria-label="Loading item"
      aria-busy="true"
    >
      <div className={`${styles.block} ${styles.image}`} />
      <div className={styles.content}>
        <div className={`${styles.block} ${styles.title}`} />
        <div className={`${styles.block} ${styles.price}`} />
        <div className={`${styles.block} ${styles.line}`} />
        <div className={`${styles.block} ${styles.line}`} />
      </div>
    </section>
  );
}
