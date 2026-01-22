import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/api/client';
import type { ApiError } from '@/types';
import { ArrowLeft, Check, Eye, EyeOff } from 'lucide-react';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Get email from session storage
    const storedEmail = sessionStorage.getItem('resetEmail');
    if (storedEmail) {
      setEmail(storedEmail);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Le password non corrispondono');
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 12) {
      setError('La password deve essere di almeno 12 caratteri');
      setIsLoading(false);
      return;
    }

    try {
      await apiClient.post('/auth/verify-password-reset', {
        email,
        code,
        newPassword,
      });
      setSuccess(true);
      sessionStorage.removeItem('resetEmail');
      // Redirect to login after success
      setTimeout(() => {
        navigate('/auth/login');
      }, 3000);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Errore durante il reset della password. Riprova.');
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
              Reimposta password
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground">
              Inserisci il codice ricevuto via email e la nuova password
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="space-y-4">
                <div className="bg-success/10 border border-success/30 text-success px-4 py-3 rounded-lg text-sm text-center">
                  <Check className="h-6 w-6 mx-auto mb-2" />
                  <p className="font-medium">Password reimpostata con successo!</p>
                  <p className="mt-2 text-xs">Reindirizzamento al login...</p>
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
                    className="bg-input border-border text-foreground text-center text-xl tracking-widest placeholder:text-muted-foreground"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Inserisci il codice a 6 cifre ricevuto via email
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-foreground">Nuova password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={12}
                      className="bg-input border-border text-foreground pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Minimo 12 caratteri, una maiuscola, una minuscola, un numero e un carattere speciale
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-foreground">Conferma password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="bg-input border-border text-foreground"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-yellow-500 hover:from-primary/90 hover:to-yellow-500/90 text-primary-foreground"
                  disabled={isLoading || code.length < 6}
                >
                  {isLoading ? 'Reimpostazione...' : 'Reimposta password'}
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
