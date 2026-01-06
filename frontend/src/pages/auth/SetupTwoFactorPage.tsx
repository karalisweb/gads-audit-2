import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/api/client';
import type { ApiError } from '@/types';

export function SetupTwoFactorPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'loading' | 'setup' | 'backup'>('loading');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchSetup = async () => {
      try {
        const response = await apiClient.get<{ qrCode: string; secret: string }>(
          '/auth/2fa/setup'
        );
        setQrCode(response.qrCode);
        setSecret(response.secret);
        setStep('setup');
      } catch (err) {
        const apiError = err as ApiError;
        setError(apiError.message || 'Failed to initialize 2FA setup');
      }
    };
    fetchSetup();
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await apiClient.post<{ backupCodes: string[] }>(
        '/auth/2fa/enable',
        { code }
      );
      setBackupCodes(response.backupCodes);
      setStep('backup');
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Invalid code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    navigate('/dashboard');
  };

  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Setting up two-factor authentication...</p>
        </div>
      </div>
    );
  }

  if (step === 'backup') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-green-600">
              2FA Enabled Successfully
            </CardTitle>
            <CardDescription className="text-center">
              Save these backup codes in a secure place. Each code can only be used once.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 border rounded-lg p-4">
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((backupCode, index) => (
                  <code
                    key={index}
                    className="bg-white border px-3 py-2 rounded text-center font-mono text-sm"
                  >
                    {backupCode}
                  </code>
                ))}
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded text-sm">
              <strong>Important:</strong> If you lose access to your authenticator app and backup
              codes, you will be locked out of your account.
            </div>

            <Button onClick={handleComplete} className="w-full">
              I've saved my backup codes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Set Up Two-Factor Authentication
          </CardTitle>
          <CardDescription className="text-center">
            Scan the QR code with your authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-center">
              {qrCode && (
                <img
                  src={qrCode}
                  alt="2FA QR Code"
                  className="w-48 h-48 border rounded"
                />
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-600 text-center">
                Can't scan the QR code? Enter this secret manually:
              </p>
              <code className="block bg-gray-100 px-4 py-2 rounded text-center font-mono text-sm break-all">
                {secret}
              </code>
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                required
                className="text-center text-2xl tracking-widest"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading || code.length < 6}>
              {isLoading ? 'Verifying...' : 'Enable 2FA'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
