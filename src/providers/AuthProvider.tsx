import type { Session, User } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';

import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (user: User) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    if (data) {
      setProfile(data as Profile);
      return;
    }
    // Accounts created before the profile trigger existed have no profiles
    // row; create one here so legacy sign-ins still work.
    const fallback = `user_${user.id.replace(/-/g, '').slice(0, 8)}`;
    const fromEmail = (user.email ?? '')
      .split('@')[0]
      .replace(/[^a-zA-Z0-9_]/g, '')
      .slice(0, 24);
    const username =
      (user.user_metadata?.username as string | undefined) ??
      (fromEmail.length >= 3 ? fromEmail : fallback);
    const displayName =
      (user.user_metadata?.display_name as string | undefined) ?? username;

    let { data: created } = await supabase
      .from('profiles')
      .insert({ id: user.id, username, display_name: displayName })
      .select()
      .single();
    if (!created && username !== fallback) {
      // Username taken — retry with a generated handle.
      ({ data: created } = await supabase
        .from('profiles')
        .insert({ id: user.id, username: fallback, display_name: displayName })
        .select()
        .single());
    }
    setProfile((created as Profile) ?? null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchProfile(session.user);
    } else {
      setProfile(null);
    }
  }, [session?.user?.id, fetchProfile]);

  const refreshProfile = useCallback(async () => {
    if (session?.user) await fetchProfile(session.user);
  }, [session?.user?.id, fetchProfile]);

  return (
    <AuthContext.Provider value={{ session, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
