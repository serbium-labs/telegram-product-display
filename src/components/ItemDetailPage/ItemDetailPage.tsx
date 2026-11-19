import type { ReactElement } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useItem, type ItemState } from '../../hooks/useItem';
import type { ItemDetails } from '../../types/catalog';
import { formatCreationDate } from '../../utils/format-date';
import { formatMoney } from '../../utils/format-money';
import { BuyButton } from '../BuyButton';
import { GallerySlider } from '../GallerySlider';
import { ItemDetailSkeleton } from '../ItemDetailSkeleton';
import styles from './ItemDetailPage.module.css';

function ItemContent({ item }: { readonly item: ItemDetails }): ReactElement {
  const formattedPrice: string = formatMoney(item.price);
  const formattedDate: string = formatCreationDate(item.paintedAt);
  const carouselImages: readonly string[] = [
    item.previewUrl,
    ...item.galleryUrls,
  ];

  return (
    <section className={styles.hero}>
      <section className={styles.media} aria-labelledby="item-gallery-title">
        <h2 id="item-gallery-title" className={styles.visuallyHidden}>
          {item.name} gallery
        </h2>
        <GallerySlider
          key={item.id}
          images={carouselImages}
          itemName={item.name}
        />
      </section>
      <div className={styles.details}>
        <p className={styles.eyebrow}>Artwork</p>
        <h1 className={styles.title}>{item.name}</h1>
        <p className={styles.price}>{formattedPrice}</p>
        <p className={styles.date}>Created {formattedDate}</p>
        <p className={styles.description}>{item.description}</p>
        <BuyButton itemId={item.id} />
      </div>
    </section>
  );
}

function renderItemState(state: ItemState): ReactElement {
  switch (state.status) {
    case 'loading':
      return <ItemDetailSkeleton />;
    case 'error':
      return (
        <section className={styles.statusPanel} role="alert">
          <h1>Unable to load this item</h1>
          <p>Please check your connection and try again.</p>
        </section>
      );
    case 'notFound':
      return (
        <section className={styles.statusPanel} role="status">
          <h1>Item not found</h1>
          <p>The requested item is not available.</p>
        </section>
      );
    case 'success':
      return <ItemContent item={state.item} />;
  }
}

export function ItemDetailPage(): ReactElement {
  const { id } = useParams<'id'>();
  const itemId: string = id ?? '';
  const itemState: ItemState = useItem(itemId);

  return (
    <main className={styles.page}>
      <nav className={styles.navigation} aria-label="Catalog navigation">
        <Link className={styles.backLink} to="/">
          Back to catalog
        </Link>
      </nav>
      {renderItemState(itemState)}
    </main>
  );
}
