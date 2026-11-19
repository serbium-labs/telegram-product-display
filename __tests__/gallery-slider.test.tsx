import {
  cleanup,
  fireEvent,
  render,
  screen,
  type RenderResult,
} from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { GallerySlider } from '../src/components/GallerySlider';

const GALLERY_IMAGES: readonly string[] = [
  '/media/items/sample-item/1.webp',
  '/media/items/sample-item/2.webp',
  '/media/items/sample-item/3.webp',
  '/media/items/sample-item/4.webp',
  '/media/items/sample-item/5.webp',
];
const MAXIMUM_MOUNTED_IMAGES = 3;
const POINTER_ID = 1;
const SWIPE_END_X = 20;
const SWIPE_START_X = 200;

afterEach((): void => {
  cleanup();
});

describe('GallerySlider', (): void => {
  it('mounts only the current, previous, and next images', (): void => {
    const renderResult: RenderResult = render(
      <GallerySlider images={GALLERY_IMAGES} itemName="Sample Item" />,
    );

    expect(renderResult.container.querySelectorAll('img')).toHaveLength(
      MAXIMUM_MOUNTED_IMAGES,
    );
    expect(
      screen.getByRole('img', { name: 'Sample Item — image 1 of 5' }),
    ).toHaveAttribute('src', GALLERY_IMAGES[0]);
  });

  it('moves forward and wraps backward infinitely', (): void => {
    render(<GallerySlider images={GALLERY_IMAGES} itemName="Sample Item" />);

    fireEvent.click(screen.getByRole('button', { name: 'Next image' }));
    expect(
      screen.getByRole('img', { name: 'Sample Item — image 2 of 5' }),
    ).toHaveAttribute('src', GALLERY_IMAGES[1]);

    fireEvent.click(screen.getByRole('button', { name: 'Previous image' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous image' }));
    expect(
      screen.getByRole('img', { name: 'Sample Item — image 5 of 5' }),
    ).toHaveAttribute('src', GALLERY_IMAGES[4]);
  });

  it('moves to the next image after a left swipe', (): void => {
    render(<GallerySlider images={GALLERY_IMAGES} itemName="Sample Item" />);
    const viewport: HTMLElement = screen.getByRole('group', {
      name: 'Swipeable gallery',
    });

    fireEvent.pointerDown(viewport, {
      clientX: SWIPE_START_X,
      pointerId: POINTER_ID,
    });
    fireEvent.pointerUp(viewport, {
      clientX: SWIPE_END_X,
      pointerId: POINTER_ID,
    });

    expect(
      screen.getByRole('img', { name: 'Sample Item — image 2 of 5' }),
    ).toBeInTheDocument();
  });
});
