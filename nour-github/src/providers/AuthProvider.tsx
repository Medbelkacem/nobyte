import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { RecordModel } from 'pocketbase';
import { pb } from '@/lib/pb';
import type { Profile } from '@/types/db';

interface AuthCtx {
  user: Profile | null;
  loading: boolean;
  isAuthed: boolean;
  refresh: () => Promise<void>;
  signOut: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

function toProfile(r: RecordModel | null): Profile | null {
  if (!r) return null;
  return {
    id:         r.id,
    first_name: (r.first_name as string) ?? null,
    last_name:  (r.last_name as string) ?? null,
    phone:      (r.phone as string) ?? null,
    lang:       (r.lang as Profile['lang']) ?? 'fr',
    theme:      (r.theme as Profile['theme']) ?? 'auto',
    role:       (r.role as Profile['role']) ?? 'citizen',
    agent_establishment_id: (r.agent_establishment as string) ?? null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(() => toProfile(pb.authStore.model as RecordModel | null));
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = async () => {
    if (!pb.authStore.isValid) {
      setUser(null);
      return;
    }
    try {
      const fresh = await pb.collection('users').authRefresh();
      setUser(toProfile(fresh.record));
    } catch {
      pb.authStore.clear();
      setUser(null);
    }
  };

  useEffect(() => {
    // Restaure le user au démarrage
    refresh().finally(() => setLoading(false));
    // Écoute les changements d'auth (login/logout multi-onglets)
    const unsubscribe = pb.authStore.onChange(() => {
      setUser(toProfile(pb.authStore.model as RecordModel | null));
    });
    return () => unsubscribe();
  }, []);

  const value = useMemo<AuthCtx>(() => ({
    user, loading,
    isAuthed: !!user,
    refresh,
    signOut: () => pb.authStore.clear(),
  }), [user, loading]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
