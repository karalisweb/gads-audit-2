import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/auth.store';
import type { ApiError } from '@/types';

const APP_VERSION = 'v2.18.8';

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
      <div className="w-full max-w-[380px]">
        <div className="login-card-shadow bg-card border border-border/40 rounded-2xl px-8 py-10">
          {/* Logo Karalisweb */}
          <div className="flex items-center justify-center mb-8">
            <img
              src="/logo-karalisweb.png"
              alt="Karalisweb"
              className="h-20"
            />
          </div>

          {/* Nome App con gradiente */}
          <h1 className="text-center text-[26px] font-bold login-title-gradient mb-1">
            KW GADS Audit
          </h1>
          <p className="text-center text-muted-foreground text-sm mb-10">
            Google Ads Audit Tool &nbsp;|&nbsp; {APP_VERSION}
          </p>

          {/* Form Login */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-foreground text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nome@karalisweb.net"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="bg-input border-border text-foreground placeholder:text-muted-foreground h-11 rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-foreground text-sm">Password</Label>
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
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="bg-input border-border text-foreground h-11 rounded-lg"
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full btn-gradient text-white font-semibold h-11 rounded-lg transition-all duration-200 cursor-pointer"
                disabled={isLoading}
              >
                {isLoading ? 'Accesso in corso...' : 'Accedi'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
