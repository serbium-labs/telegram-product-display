import type { ReactElement } from 'react';

import { useCatalog, type CatalogState } from '../../hooks/useCatalog';
import { CatalogGrid } from '../CatalogGrid';
import { CatalogSkeleton } from '../CatalogSkeleton';
import styles from './CatalogPage.module.css';

const TITLE_ID = 'catalog-title';

function renderCatalogContent(state: CatalogState): ReactElement {
  switch (state.status) {
    case 'loading':
      return <CatalogSkeleton />;
    case 'error':
      return (
        <section className={styles.statusPanel} role="alert">
          <h2 className={styles.statusTitle}>Unable to load the catalog</h2>
          <p className={styles.statusMessage}>
            Please check your connection and try again.
          </p>
        </section>
      );
    case 'empty':
      return (
        <section className={styles.statusPanel} role="status">
          <h2 className={styles.statusTitle}>No items available</h2>
          <p className={styles.statusMessage}>
            The catalog is currently empty.
          </p>
        </section>
      );
    case 'success':
      return <CatalogGrid items={state.items} />;
  }
}

export function CatalogPage(): ReactElement {
  const catalogState: CatalogState = useCatalog();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Gallery</p>
        <h1 id={TITLE_ID} className={styles.title}>
          Catalog
        </h1>
        <p className={styles.subtitle}>Explore the current collection.</p>
      </header>
      <section className={styles.catalog} aria-labelledby={TITLE_ID}>
        {renderCatalogContent(catalogState)}
      </section>
    </main>
  );
}
