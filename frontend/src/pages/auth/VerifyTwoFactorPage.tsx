import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth.store';
import type { ApiError } from '@/types';
import { Mail, ArrowLeft } from 'lucide-react';

export function VerifyTwoFactorPage() {
  const navigate = useNavigate();
  const { verifyTwoFactor, isLoading, pendingUserId, clearAuth } = useAuthStore();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  // Get pending email from store if available
  const pendingEmail = useAuthStore((state) => {
    // The email might be stored with the pending user info
    return state.user?.email;
  });

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
      setError(apiError.message || 'Codice non valido. Riprova.');
    }
  };

  const handleCancel = () => {
    clearAuth();
    navigate('/auth/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">Karalisweb</h1>
          <p className="text-muted-foreground mt-1">Google Ads Audit</p>
        </div>

        <Card className="bg-card border-border">
          <CardHeader className="space-y-1">
            <div className="mx-auto w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-2">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl font-bold text-center text-foreground">
              Verifica la tua identita
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground">
              Ti abbiamo inviato un codice di verifica via email.
              {pendingEmail && (
                <span className="block mt-1 text-foreground font-medium">{pendingEmail}</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="code" className="text-foreground">Codice di verifica</Label>
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
                  autoComplete="one-time-code"
                  autoFocus
                  className="bg-input border-border text-foreground text-center text-2xl tracking-widest placeholder:text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground text-center">
                  Inserisci il codice a 6 cifre ricevuto via email
                </p>
              </div>

              <div className="space-y-2">
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-yellow-500 hover:from-primary/90 hover:to-yellow-500/90 text-primary-foreground"
                  disabled={isLoading || code.length < 6}
                >
                  {isLoading ? 'Verifica in corso...' : 'Verifica'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-muted-foreground hover:text-foreground"
                  onClick={handleCancel}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Torna al login
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Non hai ricevuto il codice? Controlla la cartella spam o{' '}
                <button
                  type="button"
                  onClick={handleCancel}
                  className="text-primary hover:underline"
                >
                  riprova il login
                </button>
              </p>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-8">
          v2.0.0
        </p>
      </div>
    </div>
  );
}
