import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PlayCircle, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/watch")({ component: Watch });

declare global { interface Window { show_11040287?: (opts?: any) => Promise<void>; } }

function Watch() {
  const { user, loading } = useAuth();
  const { t } = useT();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [perAd, setPerAd] = useState(0);
  const [cap, setCap] = useState(50);
  const [adsToday, setAdsToday] = useState(0);

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [loading, user]);

  const reload = async () => {
    if (!user) return;
    const [s, w] = await Promise.all([
      supabase.from("app_settings").select("reward_per_ad_usd, daily_ad_cap").eq("id", 1).maybeSingle(),
      supabase.from("ad_watches").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).gte("created_at", new Date(new Date().setHours(0,0,0,0)).toISOString()),
    ]);
    setPerAd(Number(s.data?.reward_per_ad_usd ?? 0)); setCap(s.data?.daily_ad_cap ?? 50); setAdsToday(w.count ?? 0);
  };
  useEffect(() => { reload(); }, [user]);

  const watch = async () => {
    if (adsToday >= cap) { toast.error(t("daily_limit_hit")); return; }
    setBusy(true);
    try {
      // Ask Monetag SDK to show a rewarded interstitial.
      // Their SDK is configured server-side to POST an S2S postback to /ad-postback
      // with the user's id as zone-sub. We pass the user id as ymid/sub.
      if (typeof window !== "undefined" && typeof window.show_11040287 === "function") {
        await window.show_11040287({ type: "end", ymid: user!.id });
      } else {
        // SDK not loaded — refuse to credit. We never simulate ad watches.
        toast.error(t("ad_failed") + " — " + t("ad_blocked_note"));
        setBusy(false); return;
      }
      // Wait a moment for the postback to land, then refresh.
      await new Promise(r => setTimeout(r, 2500));
      await reload();
      toast.success(t("ad_reward_credited"));
    } catch (e: any) { toast.error(e.message ?? t("ad_failed")); }
    finally { setBusy(false); }
  };

  return (
    <AppShell>
      <div className="glass rounded-3xl p-6 text-center">
        <ShieldCheck className="mx-auto size-10 text-primary" />
        <h2 className="mt-3 text-xl font-bold">{t("watch_ad")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("reward_per_ad")}: <span className="text-foreground font-semibold">${perAd.toFixed(4)}</span></p>
        <p className="text-xs text-muted-foreground">{t("ads_today")}: {adsToday}/{cap}</p>

        <Button onClick={watch} disabled={busy || adsToday >= cap} className="mt-6 w-full glow-primary" size="lg">
          <PlayCircle className="size-5" /> {busy ? t("watching") : t("watch_ad")}
        </Button>

        <p className="mt-6 text-[10px] leading-relaxed text-muted-foreground">{t("legal_note")}</p>
      </div>
    </AppShell>
  );
}
