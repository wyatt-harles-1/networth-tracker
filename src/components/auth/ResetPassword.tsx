/**
 * ============================================================================
 * ResetPassword Component
 * ============================================================================
 *
 * Password reset request form for users who forgot their password.
 *
 * Features:
 * - Email input for password reset
 * - Success confirmation screen
 * - Error message display
 * - Loading state during submission
 * - Link back to login
 *
 * Password Reset Flow:
 * 1. User enters email address
 * 2. Reset link sent via email (if account exists)
 * 3. Success screen displayed
 * 4. User clicks link in email to set new password
 * 5. Redirected to login
 *
 * Security:
 * - Uses Supabase password reset flow
 * - Reset link expires after set time
 * - Does not reveal if email exists (security best practice)
 *
 * Props:
 * - onSwitchToLogin: Navigate back to login form
 *
 * ============================================================================
 */

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  AlertCircle,
  Loader2,
  TrendingUp,
  CheckCircle,
  ArrowLeft,
} from 'lucide-react';

interface ResetPasswordProps {
  onSwitchToLogin: () => void;
}

/**
 * Password reset form component
 */
export function ResetPassword({ onSwitchToLogin }: ResetPasswordProps) {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await resetPassword(email);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 bg-white shadow-xl border-0">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Check Your Email
            </h2>
            <p className="text-gray-600 mb-6">
              We've sent a password reset link to <strong>{email}</strong>.
            </p>
            <Button
              onClick={onSwitchToLogin}
              className="w-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white"
            >
              Back to Sign In
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-white shadow-xl border-0">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-teal-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Reset Password
          </h1>
          <p className="text-sm text-gray-600 mt-2">
            Enter your email to receive a reset link
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={loading}
              className="mt-1"
              style={{
                WebkitBoxShadow: '0 0 0 1000px white inset',
                WebkitTextFillColor: 'inherit',
              }}
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Reset Link'
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={onSwitchToLogin}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center justify-center gap-2 mx-auto"
            disabled={loading}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </button>
        </div>
      </Card>
    </div>
  );
}
