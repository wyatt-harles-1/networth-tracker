/**
 * ============================================================================
 * AuthContext - Authentication State Management
 * ============================================================================
 *
 * Provides authentication state and methods throughout the application.
 * Built on top of Supabase Auth.
 *
 * Features:
 * - Persistent authentication across page refreshes
 * - Real-time auth state changes (login/logout)
 * - User profile creation on signup
 * - Password reset functionality
 * - Loading state for auth initialization
 *
 * Usage:
 * ```tsx
 * const { user, signIn, signOut } = useAuth();
 *
 * if (user) {
 *   // User is authenticated
 * }
 * ```
 *
 * State Management:
 * - user: Current authenticated user object
 * - session: Active session with tokens
 * - loading: True during initialization and auth changes
 *
 * Methods:
 * - signUp: Create new user account with profile
 * - signIn: Authenticate existing user
 * - signOut: End current session
 * - resetPassword: Send password reset email
 *
 * ============================================================================
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Shape of the authentication context
 * Provides user state and authentication methods to consuming components
 */
interface AuthContextType {
  /** Current authenticated user (null if not logged in) */
  user: User | null;

  /** Active session with access/refresh tokens */
  session: Session | null;

  /** True when checking auth state or performing auth operations */
  loading: boolean;

  /**
   * Create a new user account
   * @param email - User's email address
   * @param password - User's password (min 6 characters)
   * @param fullName - User's full name for profile
   * @returns Error if signup failed, null on success
   */
  signUp: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ error: AuthError | null }>;

  /**
   * Sign in with email and password
   * @param email - User's email
   * @param password - User's password
   * @returns Error if login failed, null on success
   */
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: AuthError | null }>;

  /**
   * Sign out current user
   * Clears session and redirects to auth page
   */
  signOut: () => Promise<void>;

  /**
   * Send password reset email
   * @param email - Email address to send reset link
   * @returns Error if reset failed, null on success
   */
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
}

// ============================================================================
// CONTEXT CREATION
// ============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

/**
 * AuthProvider Component
 *
 * Wraps the application to provide authentication state to all child components.
 * Automatically handles:
 * - Initial session restoration from local storage
 * - Real-time auth state changes via Supabase listener
 * - Profile creation on user signup
 *
 * @param children - Child components to wrap with auth context
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // ===== STATE =====
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // ===== INITIALIZATION & AUTH LISTENER =====
  useEffect(() => {
    // Get initial session (from local storage if persisted)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth state changes (login, logout, token refresh, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      })();
    });

    // Cleanup subscription on unmount
    return () => subscription.unsubscribe();
  }, []);

  // ===== AUTH METHODS =====

  /**
   * Create a new user account
   *
   * Process:
   * 1. Creates auth user in Supabase Auth
   * 2. Creates profile record in profiles table with user metadata
   * 3. Auto-sets currency to USD and timezone from browser
   *
   * @param email - User's email address
   * @param password - User's password
   * @param fullName - User's full name
   * @returns Object with error if signup failed
   */
  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    // Create profile record for the new user
    if (!error && data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: fullName,
        currency: 'USD',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    }

    return { error };
  };

  /**
   * Sign in with email and password
   *
   * Authenticates user and establishes a session.
   * Session is automatically persisted to local storage.
   *
   * @param email - User's email
   * @param password - User's password
   * @returns Object with error if login failed
   */
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  };

  /**
   * Sign out current user
   *
   * Clears session from memory and local storage.
   * Auth state change listener will automatically update UI.
   */
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  /**
   * Send password reset email
   *
   * Sends an email with a magic link to reset password.
   * User will be redirected to /reset-password after clicking link.
   *
   * @param email - Email address to send reset link
   * @returns Object with error if request failed
   */
  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    return { error };
  };

  // ===== PROVIDER RENDER =====
  return (
    <AuthContext.Provider
      value={{ user, session, loading, signUp, signIn, signOut, resetPassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * useAuth Hook
 *
 * Access authentication state and methods from any component.
 * Must be used within an AuthProvider.
 *
 * @throws Error if used outside AuthProvider
 * @returns Authentication context with user state and methods
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, signOut } = useAuth();
 *
 *   if (!user) {
 *     return <div>Not logged in</div>;
 *   }
 *
 *   return (
 *     <div>
 *       Welcome, {user.email}
 *       <button onClick={signOut}>Sign Out</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
