import type { ReactElement } from 'react';

import { usePurchaseIntent } from '../../hooks/usePurchaseIntent';
import styles from './BuyButton.module.css';

export interface BuyButtonProperties {
  readonly itemId: string;
}

export function BuyButton({ itemId }: BuyButtonProperties): ReactElement {
  const { errorMessage, isSubmitting, submit } = usePurchaseIntent(itemId);

  return (
    <div className={styles.container}>
      <button
        className={styles.button}
        type="button"
        disabled={isSubmitting}
        onClick={(): void => {
          void submit();
        }}
      >
        {isSubmitting ? 'Opening Telegram…' : 'Buy'}
      </button>
      {errorMessage === null ? null : (
        <p className={styles.error} role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
