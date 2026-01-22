import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/api/client';
import type { ApiError } from '@/types';
import { ArrowLeft, Mail } from 'lucide-react';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await apiClient.post('/auth/request-password-reset', { email });
      setSuccess(true);
      // Store email for the reset page
      sessionStorage.setItem('resetEmail', email);
      // Navigate to reset page after a brief delay
      setTimeout(() => {
        navigate('/auth/reset-password');
      }, 2000);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Errore durante la richiesta. Riprova.');
    } finally {
      setIsLoading(false);
    }
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
            <CardTitle className="text-xl font-bold text-center text-foreground">
              Password dimenticata?
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground">
              Inserisci la tua email per ricevere un codice di verifica
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="space-y-4">
                <div className="bg-success/10 border border-success/30 text-success px-4 py-3 rounded-lg text-sm text-center">
                  <Mail className="h-5 w-5 mx-auto mb-2" />
                  <p>Se l'email esiste nel sistema, riceverai un codice di verifica.</p>
                  <p className="mt-2 text-xs">Reindirizzamento in corso...</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@karalisweb.net"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-yellow-500 hover:from-primary/90 hover:to-yellow-500/90 text-primary-foreground"
                  disabled={isLoading}
                >
                  {isLoading ? 'Invio in corso...' : 'Invia codice di verifica'}
                </Button>

                <Link
                  to="/auth/login"
                  className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Torna al login
                </Link>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-8">
          v2.0.0
        </p>
      </div>
    </div>
  );
}
