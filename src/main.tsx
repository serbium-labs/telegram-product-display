import { StrictMode, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import { App } from './components/App';
import './index.css';

const ROOT_ELEMENT_ID = 'root';

function bootstrap(): void {
  const rootElement: HTMLElement | null =
    document.getElementById(ROOT_ELEMENT_ID);

  if (rootElement === null) {
    throw new Error(`Missing #${ROOT_ELEMENT_ID} application root`);
  }

  const root: Root = createRoot(rootElement);
  const application: ReactElement = (
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>
  );

  root.render(application);
}

bootstrap();
