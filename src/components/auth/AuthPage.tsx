import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Login } from './Login';
import { Signup } from './Signup';
import { ResetPassword } from './ResetPassword';

type AuthView = 'login' | 'signup' | 'reset';

export function AuthPage() {
  const [view, setView] = useState<AuthView>('login');
  const { user, loading } = useAuth();

  // Redirect to dashboard if user is already authenticated
  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <>
      {view === 'login' && (
        <Login
          onSwitchToSignup={() => setView('signup')}
          onSwitchToReset={() => setView('reset')}
        />
      )}
      {view === 'signup' && <Signup onSwitchToLogin={() => setView('login')} />}
      {view === 'reset' && (
        <ResetPassword onSwitchToLogin={() => setView('login')} />
      )}
    </>
  );
}
