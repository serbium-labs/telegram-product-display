import { useRef, useState, type PointerEvent, type ReactElement } from 'react';

import styles from './GallerySlider.module.css';

const SWIPE_THRESHOLD_PIXELS = 48;

type SlidePosition = 'current' | 'next' | 'previous';

interface VisibleSlide {
  readonly index: number;
  readonly position: SlidePosition;
  readonly url: string;
}

export interface GallerySliderProperties {
  readonly images: readonly string[];
  readonly itemName: string;
}

const SLIDE_CLASS_NAMES: Record<SlidePosition, string> = {
  current: styles.current ?? '',
  next: styles.next ?? '',
  previous: styles.previous ?? '',
};

function wrapIndex(index: number, imageCount: number): number {
  return (index + imageCount) % imageCount;
}

function getVisibleSlides(
  images: readonly string[],
  currentIndex: number,
): readonly VisibleSlide[] {
  const imageCount: number = images.length;

  if (imageCount === 0) {
    return [];
  }

  const candidates: readonly Omit<VisibleSlide, 'url'>[] = [
    { index: currentIndex, position: 'current' },
    { index: wrapIndex(currentIndex - 1, imageCount), position: 'previous' },
    { index: wrapIndex(currentIndex + 1, imageCount), position: 'next' },
  ];
  const includedIndexes = new Set<number>();
  const slides: VisibleSlide[] = [];

  candidates.forEach((candidate: Omit<VisibleSlide, 'url'>): void => {
    if (includedIndexes.has(candidate.index)) {
      return;
    }

    const url: string | undefined = images[candidate.index];

    if (url === undefined) {
      return;
    }

    includedIndexes.add(candidate.index);
    slides.push({ ...candidate, url });
  });

  return slides;
}

export function GallerySlider({
  images,
  itemName,
}: GallerySliderProperties): ReactElement {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const pointerStartX = useRef<number | null>(null);
  const imageCount: number = images.length;
  const safeCurrentIndex: number =
    imageCount === 0 ? 0 : currentIndex % imageCount;
  const visibleSlides: readonly VisibleSlide[] = getVisibleSlides(
    images,
    safeCurrentIndex,
  );

  function showPreviousImage(): void {
    setCurrentIndex((index: number): number =>
      wrapIndex(index - 1, imageCount),
    );
  }

  function showNextImage(): void {
    setCurrentIndex((index: number): number =>
      wrapIndex(index + 1, imageCount),
    );
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>): void {
    pointerStartX.current = event.clientX;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>): void {
    const startX: number | null = pointerStartX.current;

    pointerStartX.current = null;

    if (startX === null) {
      return;
    }

    const horizontalDistance: number = event.clientX - startX;

    if (Math.abs(horizontalDistance) < SWIPE_THRESHOLD_PIXELS) {
      return;
    }

    if (horizontalDistance < 0) {
      showNextImage();

      return;
    }

    showPreviousImage();
  }

  function handlePointerCancel(): void {
    pointerStartX.current = null;
  }

  if (imageCount === 0) {
    return <p className={styles.empty}>No gallery images available.</p>;
  }

  return (
    <section className={styles.gallery} aria-label="Image gallery">
      <div
        className={styles.viewport}
        role="group"
        aria-label="Swipeable gallery"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {visibleSlides.map((slide: VisibleSlide): ReactElement => {
          const isCurrent: boolean = slide.position === 'current';
          const accessiblePosition: number = slide.index + 1;
          const alternativeText: string = isCurrent
            ? `${itemName} — image ${accessiblePosition} of ${imageCount}`
            : '';

          return (
            <figure
              className={`${styles.slide} ${SLIDE_CLASS_NAMES[slide.position]}`}
              aria-hidden={!isCurrent}
              key={slide.index}
            >
              <img
                className={styles.image}
                src={slide.url}
                alt={alternativeText}
                width="1"
                height="1"
                loading={isCurrent ? 'eager' : 'lazy'}
                decoding="async"
              />
            </figure>
          );
        })}
      </div>

      <div className={styles.controls}>
        <button
          className={styles.controlButton}
          type="button"
          onClick={showPreviousImage}
          disabled={imageCount === 1}
          aria-label="Previous image"
        >
          Prev
        </button>
        <p className={styles.counter} aria-live="polite">
          {safeCurrentIndex + 1} / {imageCount}
        </p>
        <button
          className={styles.controlButton}
          type="button"
          onClick={showNextImage}
          disabled={imageCount === 1}
          aria-label="Next image"
        >
          Next
        </button>
      </div>
    </section>
  );
}
