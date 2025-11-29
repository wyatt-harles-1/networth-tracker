/**
 * ============================================================================
 * Application Entry Point
 * ============================================================================
 *
 * Bootstrap file that initializes the React application.
 *
 * Setup:
 * - Imports global styles (index.css)
 * - Initializes ticker directory setup for development
 * - Renders the root App component in React StrictMode
 *
 * React StrictMode:
 * - Enables additional development checks and warnings
 * - Helps identify potential problems in the application
 * - Only active in development mode
 *
 * ============================================================================
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Import setup utilities for dev mode
import './utils/setupTickerDirectory';

// Mount the React application to the root DOM element
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
