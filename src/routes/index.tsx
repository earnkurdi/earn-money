import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wallet, TrendingUp, Clock, Flame, Gift, PlayCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

export const Route = createFileRoute("/")({ component: Home });

function StatCard({ icon: Icon, label, value, accent }: any) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className={`size-4 ${accent ?? "text-primary"}`} />
      </div>
      <div className="mt-2 text-xl font-bold">{value}</div>
    </div>
  );
}

function Home() {
  const { user, loading } = useAuth();
  const { t } = useT();
  const nav = useNavigate();
  const [balance, setBalance] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [adsToday, setAdsToday] = useState(0);
  const [bonus, setBonus] = useState<any>(null);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [loading, user]);

  const load = async () => {
    if (!user) return;
    const [b, s, w, db] = await Promise.all([
      supabase.from("balances").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("app_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("ad_watches").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).gte("created_at", new Date(new Date().setHours(0,0,0,0)).toISOString()),
      supabase.from("daily_bonus_claims").select("*").eq("user_id", user.id).order("claim_date", { ascending: false }).limit(1),
    ]);
    setBalance(b.data); setSettings(s.data); setAdsToday(w.count ?? 0); setBonus(db.data?.[0] ?? null);
  };
  useEffect(() => { load(); }, [user]);

  const claimedToday = bonus?.claim_date === new Date().toISOString().slice(0,10);

  const claim = async () => {
    setClaiming(true);
    const { data, error } = await supabase.functions.invoke("claim-daily-bonus");
    setClaiming(false);
    if (error || (data as any)?.error) toast.error((data as any)?.error || error?.message || "Failed");
    else { toast.success(`+$${(data as any).amount}`); load(); }
  };

  if (loading || !user) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">{t("loading")}</div>;

  const bal = Number(balance?.balance_usd ?? 0);
  const lifetime = Number(balance?.lifetime_earned_usd ?? 0);
  const pending = Number(balance?.pending_withdraw_usd ?? 0);
  const cap = settings?.daily_ad_cap ?? 50;
  const perAd = Number(settings?.reward_per_ad_usd ?? 0.002);

  return (
    <AppShell>
      <section className="glass relative overflow-hidden rounded-3xl p-6">
        <div className="absolute -right-10 -top-10 size-40 rounded-full bg-primary/20 blur-3xl" />
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{t("balance")}</p>
        <div className="mt-1 text-4xl font-extrabold text-gradient">${bal.toFixed(4)}</div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <div><div className="text-muted-foreground">{t("lifetime")}</div><div className="font-semibold">${lifetime.toFixed(4)}</div></div>
          <div><div className="text-muted-foreground">{t("pending")}</div><div className="font-semibold">${pending.toFixed(4)}</div></div>
        </div>
        <Link to="/watch" className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground glow-primary">
          <PlayCircle className="size-5" /> {t("watch_ad")} +${perAd.toFixed(4)}
        </Link>
      </section>

      <section className="mt-4 grid grid-cols-3 gap-3">
        <StatCard icon={TrendingUp} label={t("reward_per_ad")} value={`$${perAd.toFixed(4)}`} />
        <StatCard icon={Clock} label={t("ads_today")} value={`${adsToday}/${cap}`} />
        <StatCard icon={Flame} label={t("streak")} value={bonus?.streak_day ?? 0} accent="text-warning" />
      </section>

      <section className="mt-4 glass rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="size-5 text-accent" />
            <div>
              <div className="text-sm font-semibold">{t("daily_bonus")}</div>
              <div className="text-xs text-muted-foreground">${Number(settings?.daily_bonus_base_usd ?? 0.01).toFixed(4)}+ / day</div>
            </div>
          </div>
          <Button onClick={claim} disabled={claimedToday || claiming} size="sm">
            {claimedToday ? t("claimed") : (claiming ? "…" : t("claim"))}
          </Button>
        </div>
      </section>

      <p className="mt-6 text-center text-[10px] leading-relaxed text-muted-foreground">{t("legal_note")}</p>
    </AppShell>
  );
}
