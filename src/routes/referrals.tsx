import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/referrals")({ component: Refs });

function Refs() {
  const { user, loading } = useAuth();
  const { t } = useT();
  const nav = useNavigate();
  const [code, setCode] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [earned, setEarned] = useState(0);

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [loading, user]);
  useEffect(() => { (async () => {
    if (!user) return;
    const [p, r] = await Promise.all([
      supabase.from("profiles").select("referral_code").eq("id", user.id).maybeSingle(),
      supabase.from("referrals").select("*").eq("referrer_id", user.id),
    ]);
    setCode(p.data?.referral_code ?? "");
    setRows(r.data ?? []);
    setEarned((r.data ?? []).reduce((s, x: any) => s + Number(x.commission_earned_usd || 0), 0));
  })(); }, [user]);

  const link = typeof window !== "undefined" ? `${window.location.origin}/auth?ref=${code}` : "";
  const copy = async (text: string) => { await navigator.clipboard.writeText(text); toast.success(t("copied")); };

  return (
    <AppShell>
      <div className="glass rounded-3xl p-5 text-center">
        <Users className="mx-auto size-10 text-accent" />
        <p className="mt-2 text-xs text-muted-foreground">{t("referral_code")}</p>
        <div className="mt-1 text-3xl font-extrabold tracking-widest text-gradient">{code || "…"}</div>
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-background/40 px-3 py-2 text-xs">
          <span className="truncate flex-1 text-left">{link}</span>
          <Button size="sm" variant="ghost" onClick={() => copy(link)}><Copy className="size-3" /></Button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-muted/40 p-3"><div className="text-xs text-muted-foreground">{rows.length}</div><div className="font-bold">Invited</div></div>
          <div className="rounded-xl bg-muted/40 p-3"><div className="text-xs text-muted-foreground">${earned.toFixed(4)}</div><div className="font-bold">Earned</div></div>
        </div>
      </div>
    </AppShell>
  );
}
