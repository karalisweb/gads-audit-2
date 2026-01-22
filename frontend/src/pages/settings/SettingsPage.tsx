import { useState } from 'react';
import { Settings, User, Lock, Shield, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';
import { apiClient } from '@/api/client';
import type { ApiError } from '@/types';

type TabType = 'profile' | 'password' | 'security';

export function SettingsPage() {
  const { user, setTokens, accessToken, refreshToken } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('profile');

  // Profile state
  const [name, setName] = useState(user?.name || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Security state
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securitySuccess, setSecuritySuccess] = useState('');
  const [securityError, setSecurityError] = useState('');

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      const response = await apiClient.patch<{ user: typeof user }>('/auth/profile', { name });
      if (response.user && accessToken && refreshToken) {
        setTokens(accessToken, refreshToken, response.user);
      }
      setProfileSuccess('Profilo aggiornato con successo');
    } catch (err) {
      const apiError = err as ApiError;
      setProfileError(apiError.message || 'Errore durante l\'aggiornamento del profilo');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('Le password non corrispondono');
      setPasswordLoading(false);
      return;
    }

    if (newPassword.length < 12) {
      setPasswordError('La password deve essere di almeno 12 caratteri');
      setPasswordLoading(false);
      return;
    }

    try {
      await apiClient.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      setPasswordSuccess('Password aggiornata con successo');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const apiError = err as ApiError;
      setPasswordError(apiError.message || 'Errore durante l\'aggiornamento della password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleToggle2FA = async () => {
    setSecurityLoading(true);
    setSecurityError('');
    setSecuritySuccess('');

    try {
      const newEnabled = !user?.twoFactorEnabled;
      await apiClient.patch('/auth/2fa', { enabled: newEnabled });

      // Update local user state
      if (user && accessToken && refreshToken) {
        setTokens(accessToken, refreshToken, { ...user, twoFactorEnabled: newEnabled });
      }

      setSecuritySuccess(newEnabled ? '2FA attivata con successo' : '2FA disattivata con successo');
    } catch (err) {
      const apiError = err as ApiError;
      setSecurityError(apiError.message || 'Errore durante l\'aggiornamento della 2FA');
    } finally {
      setSecurityLoading(false);
    }
  };

  const tabs = [
    { id: 'profile' as TabType, label: 'Profilo', icon: User },
    { id: 'password' as TabType, label: 'Password', icon: Lock },
    { id: 'security' as TabType, label: 'Sicurezza', icon: Shield },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Settings className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Impostazioni</h1>
          <p className="text-muted-foreground text-sm">Gestisci il tuo profilo e le preferenze</p>
        </div>
      </div>

      {/* User Card */}
      <Card className="mb-6 bg-card border-border">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg bg-primary/20 flex items-center justify-center">
              <User className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {user?.name || user?.email?.split('@')[0] || 'Utente'}
              </h2>
              <p className="text-muted-foreground text-sm">{user?.email}</p>
              <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded">
                {user?.role === 'admin' ? 'Amministratore' : 'Utente'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card className="mb-6 bg-card border-border">
        <CardContent className="p-2">
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-primary to-yellow-500 text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tab Content */}
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground mb-4">Modifica profilo</h3>

              {profileSuccess && (
                <div className="bg-success/10 border border-success/30 text-success px-4 py-3 rounded-lg text-sm">
                  {profileSuccess}
                </div>
              )}

              {profileError && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg text-sm">
                  {profileError}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground">Nome</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Il tuo nome"
                  className="bg-input border-border text-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-input border-border text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground">L'email non puo essere modificata</p>
              </div>

              <Button
                type="submit"
                disabled={profileLoading}
                className="bg-gradient-to-r from-primary to-yellow-500 hover:from-primary/90 hover:to-yellow-500/90 text-primary-foreground"
              >
                {profileLoading ? 'Salvataggio...' : 'Salva modifiche'}
              </Button>
            </form>
          )}

          {activeTab === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground mb-4">Cambia password</h3>

              {passwordSuccess && (
                <div className="bg-success/10 border border-success/30 text-success px-4 py-3 rounded-lg text-sm">
                  {passwordSuccess}
                </div>
              )}

              {passwordError && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg text-sm">
                  {passwordError}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-foreground">Password attuale</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="bg-input border-border text-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-foreground">Nuova password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={12}
                  className="bg-input border-border text-foreground"
                />
                <p className="text-xs text-muted-foreground">Minimo 12 caratteri</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-foreground">Conferma nuova password</Label>
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
                disabled={passwordLoading}
                className="bg-gradient-to-r from-primary to-yellow-500 hover:from-primary/90 hover:to-yellow-500/90 text-primary-foreground"
              >
                {passwordLoading ? 'Aggiornamento...' : 'Aggiorna password'}
              </Button>
            </form>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Autenticazione a due fattori (2FA)</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Aggiungi un livello di sicurezza extra al tuo account. Quando attiva, ti verra richiesto un codice OTP via email ogni volta che effettui il login.
                </p>
              </div>

              {securitySuccess && (
                <div className="bg-success/10 border border-success/30 text-success px-4 py-3 rounded-lg text-sm">
                  {securitySuccess}
                </div>
              )}

              {securityError && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg text-sm">
                  {securityError}
                </div>
              )}

              {/* 2FA Status Card */}
              <Card className="bg-card/50 border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      user?.twoFactorEnabled ? 'bg-success/20' : 'bg-muted'
                    }`}>
                      {user?.twoFactorEnabled ? (
                        <Check className="h-5 w-5 text-success" />
                      ) : (
                        <Shield className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        {user?.twoFactorEnabled ? '2FA Attiva' : '2FA Non Attiva'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {user?.twoFactorEnabled
                          ? `Codici inviati a: ${user.email}`
                          : 'Attiva la 2FA per una maggiore sicurezza'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Toggle 2FA Card */}
              <Card className="bg-card/50 border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">
                        {user?.twoFactorEnabled ? 'Disattiva 2FA' : 'Attiva 2FA'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {user?.twoFactorEnabled
                          ? 'Rimuovi il secondo fattore di autenticazione'
                          : 'Abilita il secondo fattore di autenticazione'}
                      </p>
                    </div>
                    <Button
                      onClick={handleToggle2FA}
                      disabled={securityLoading}
                      variant={user?.twoFactorEnabled ? 'outline' : 'default'}
                      className={!user?.twoFactorEnabled ? 'bg-gradient-to-r from-primary to-yellow-500 hover:from-primary/90 hover:to-yellow-500/90 text-primary-foreground' : ''}
                    >
                      {securityLoading ? 'Attendere...' : user?.twoFactorEnabled ? 'Disattiva' : 'Attiva'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
