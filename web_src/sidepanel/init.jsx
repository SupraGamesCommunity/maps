import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { Sidepanel } from './Sidepanel.jsx';

export function initSidepanel() {
  createRoot(document.getElementById('sidepanel-inner')).render(
    <StrictMode>
      <Sidepanel />
    </StrictMode>
  );
}
