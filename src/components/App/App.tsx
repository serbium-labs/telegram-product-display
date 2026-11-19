import type { ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { CatalogPage } from '../CatalogPage';
import { ItemDetailPage } from '../ItemDetailPage';

export function App(): ReactElement {
  return (
    <Routes>
      <Route path="/" element={<CatalogPage />} />
      <Route path="/item/:id" element={<ItemDetailPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
