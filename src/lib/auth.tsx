import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roleLoading: boolean;
  isAdmin: boolean;
  refreshRole: () => Promise<boolean>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({ user: null, session: null, loading: true, roleLoading: true, isAdmin: false, refreshRole: async () => false, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setRoleLoading(!!s?.user);
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setRoleLoading(!!data.session?.user);
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const refreshRole = useCallback(async () => {
    const userId = session?.user?.id;
    if (!userId) {
      setIsAdmin(false);
      setRoleLoading(false);
      return false;
    }

    setRoleLoading(true);
    const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    const nextIsAdmin = !error && data === true;
    console.log("[Earn][Admin] admin role loaded", { userId, isAdmin: nextIsAdmin, error: error?.message ?? null });
    setIsAdmin(nextIsAdmin);
    setRoleLoading(false);
    return nextIsAdmin;
  }, [session?.user?.id]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!cancelled) await refreshRole();
    };
    run();
    return () => { cancelled = true; };
  }, [session?.user?.id, refreshRole]);

  return (
    <Ctx.Provider value={{ user: session?.user ?? null, session, loading: loading || roleLoading, roleLoading, isAdmin, refreshRole, signOut: async () => { await supabase.auth.signOut(); } }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
