import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth.store';
import type { ApiError } from '@/types';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const needs2FA = await login(email, password);
      if (needs2FA) {
        navigate('/auth/verify-2fa');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Login failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Logo e Titolo App */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-gradient-brand">
            KW GADS Audit
          </h1>
          <p className="text-muted-foreground text-sm mt-2">Google Ads Audit Tool</p>
        </div>

        <Card className="bg-card border-border shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl font-bold text-center text-foreground">
              Accedi
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground">
              Inserisci le tue credenziali per continuare
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-foreground">Password</Label>
                  <Link
                    to="/auth/forgot-password"
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    Password dimenticata?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="bg-input border-border text-foreground"
                />
              </div>

              <Button
                type="submit"
                className="w-full btn-gradient text-white font-medium transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading ? 'Accesso in corso...' : 'Accedi'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-8">
          v2.8.0
        </p>
      </div>
    </div>
  );
}
