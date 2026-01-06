import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth.store';
import type { ApiError } from '@/types';

export function VerifyTwoFactorPage() {
  const navigate = useNavigate();
  const { verifyTwoFactor, isLoading, pendingUserId, clearAuth } = useAuthStore();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!pendingUserId) {
      navigate('/auth/login');
    }
  }, [pendingUserId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await verifyTwoFactor(code);
      navigate('/dashboard');
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Invalid code. Please try again.');
    }
  };

  const handleCancel = () => {
    clearAuth();
    navigate('/auth/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Two-Factor Authentication
          </CardTitle>
          <CardDescription className="text-center">
            Enter the 6-digit code from your authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                required
                autoComplete="one-time-code"
                className="text-center text-2xl tracking-widest"
              />
              <p className="text-xs text-gray-500 text-center">
                You can also use a backup code
              </p>
            </div>

            <div className="space-y-2">
              <Button type="submit" className="w-full" disabled={isLoading || code.length < 6}>
                {isLoading ? 'Verifying...' : 'Verify'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleCancel}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
