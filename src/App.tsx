/**
 * ============================================================================
 * App Component - Application Root
 * ============================================================================
 *
 * The main entry point component for the Networth Tracker application.
 * Sets up the core application structure with routing and authentication.
 *
 * Architecture:
 * - Wraps the entire app with AuthProvider for authentication state management
 * - Uses React Router for client-side navigation
 * - All routes are defined in ./routes/index.tsx
 *
 * Component Hierarchy:
 * App
 *  └─ AuthProvider (provides authentication context to entire app)
 *      └─ RouterProvider (handles all routing logic)
 *          └─ Route components (Dashboard, Portfolio, Accounts, etc.)
 *
 * ============================================================================
 */

import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { AuthProvider } from './contexts/AuthContext';

/**
 * Main App component
 *
 * Bootstraps the application with:
 * - Authentication context
 * - Client-side routing
 *
 * @returns The root application component
 */
function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default App;
