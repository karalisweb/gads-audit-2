import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { getUsers, inviteUser, updateUserRole, activateUser, deactivateUser, deleteUser } from '@/api/users';
import type { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  UserPlus,
  Shield,
  ShieldOff,
  UserCheck,
  UserX,
  Trash2,
  Loader2,
  Users,
  Mail,
} from 'lucide-react';

export function AdminUsersPage() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Action loading state
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      setError('Errore nel caricamento degli utenti');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Clear messages after 4 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const handleInvite = async () => {
    if (!inviteEmail.endsWith('@karalisweb.net')) {
      setError('Solo indirizzi @karalisweb.net sono consentiti');
      return;
    }
    setInviteLoading(true);
    try {
      await inviteUser(inviteEmail);
      setSuccess(`Invito inviato a ${inviteEmail}`);
      setInviteEmail('');
      setInviteOpen(false);
      fetchUsers();
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr.message || 'Errore nell\'invio dell\'invito');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleToggleRole = async (user: User) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    setActionLoading(user.id);
    try {
      await updateUserRole(user.id, newRole);
      setSuccess(`Ruolo di ${user.email} aggiornato a ${newRole}`);
      fetchUsers();
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr.message || 'Errore nell\'aggiornamento del ruolo');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleActive = async (user: User) => {
    setActionLoading(user.id);
    try {
      if (user.isActive) {
        await deactivateUser(user.id);
        setSuccess(`${user.email} disattivato`);
      } else {
        await activateUser(user.id);
        setSuccess(`${user.email} attivato`);
      }
      fetchUsers();
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr.message || 'Errore nell\'aggiornamento dello stato');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteUser(deleteTarget.id);
      setSuccess(`${deleteTarget.email} eliminato`);
      setDeleteTarget(null);
      fetchUsers();
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr.message || 'Errore nell\'eliminazione dell\'utente');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Accesso non autorizzato</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestione Utenti</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Invita collaboratori e gestisci i permessi
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Invita Utente
        </Button>
      </div>

      {/* Messages */}
      {success && (
        <div className="bg-success/10 border border-success/30 text-success px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Users table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
          <Users className="h-10 w-10 mb-2 opacity-50" />
          <p>Nessun utente trovato</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Utente</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Ruolo</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Stato</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">2FA</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Registrato</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === currentUser?.id;
                const loading = actionLoading === u.id;
                return (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {u.name || '—'}
                          {isSelf && <span className="text-xs text-muted-foreground ml-2">(tu)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                        {u.role === 'admin' ? 'Admin' : 'Utente'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={u.isActive ? 'default' : 'destructive'}>
                        {u.isActive ? 'Attivo' : 'Disattivato'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={u.twoFactorEnabled ? 'default' : 'outline'}>
                        {u.twoFactorEnabled ? 'Attivo' : 'No'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString('it-IT')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {loading ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                          <>
                            {/* Toggle role */}
                            {!isSelf && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleRole(u)}
                                title={u.role === 'admin' ? 'Rimuovi admin' : 'Rendi admin'}
                              >
                                {u.role === 'admin' ? (
                                  <ShieldOff className="h-4 w-4" />
                                ) : (
                                  <Shield className="h-4 w-4" />
                                )}
                              </Button>
                            )}

                            {/* Toggle active */}
                            {!isSelf && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleActive(u)}
                                title={u.isActive ? 'Disattiva' : 'Attiva'}
                              >
                                {u.isActive ? (
                                  <UserX className="h-4 w-4" />
                                ) : (
                                  <UserCheck className="h-4 w-4" />
                                )}
                              </Button>
                            )}

                            {/* Delete */}
                            {!isSelf && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteTarget(u)}
                                title="Elimina utente"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invita Collaboratore</DialogTitle>
            <DialogDescription>
              Invia un invito via email. Solo indirizzi @karalisweb.net sono consentiti.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Input
                type="email"
                placeholder="nome@karalisweb.net"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Annulla
            </Button>
            <Button
              onClick={handleInvite}
              disabled={inviteLoading || !inviteEmail}
            >
              {inviteLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Invia Invito
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare l'utente <strong>{deleteTarget?.email}</strong>?
              Questa azione non puo essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
