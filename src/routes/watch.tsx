import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { PlayCircle, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/watch")({ component: Watch });

type MonetagResult = {
  reward_event_type?: "valued" | "non_valued";
  estimated_price?: number;
  request_var?: string;
  ymid?: string;
};

declare global { interface Window { show_11040287?: (opts?: any) => Promise<MonetagResult>; } }

const MONETAG_ZONE = "11040287";
const SDK_SELECTOR = `script[data-sdk="show_${MONETAG_ZONE}"]`;

async function loadMonetagSdk() {
  if (typeof window === "undefined") return false;
  if (typeof window.show_11040287 === "function") {
    console.log("[Earn][Monetag] SDK already loaded", { zone: MONETAG_ZONE });
    return true;
  }

  await new Promise<void>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(SDK_SELECTOR);
    if (existing) {
      if (existing.dataset.loaded === "true" || existing.dataset.failed === "true") {
        resolve();
        return;
      }
      existing.addEventListener("load", () => { existing.dataset.loaded = "true"; resolve(); }, { once: true });
      existing.addEventListener("error", () => { existing.dataset.failed = "true"; resolve(); }, { once: true });
      setTimeout(resolve, 6000);
      return;
    }

    console.log("[Earn][Monetag] loading SDK", { zone: MONETAG_ZONE, src: "https://libtl.com/sdk.js" });
    const script = document.createElement("script");
    script.src = "https://libtl.com/sdk.js";
    script.async = true;
    script.dataset.zone = MONETAG_ZONE;
    script.dataset.sdk = `show_${MONETAG_ZONE}`;
    script.onload = () => { script.dataset.loaded = "true"; console.log("[Earn][Monetag] SDK loaded", { zone: MONETAG_ZONE }); resolve(); };
    script.onerror = () => { script.dataset.failed = "true"; console.error("[Earn][Monetag] SDK failed to load", { zone: MONETAG_ZONE }); resolve(); };
    document.head.appendChild(script);
    setTimeout(resolve, 6000);
  });

  const ready = typeof window.show_11040287 === "function";
  console.log("[Earn][Monetag] SDK ready check", { ready, zone: MONETAG_ZONE });
  return ready;
}

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
      const sdkReady = await loadMonetagSdk();
      // Ask Monetag SDK to show a rewarded interstitial.
      // Their SDK is configured server-side to POST an S2S postback to /ad-postback
      // with the user's id as zone-sub. We pass the user id as ymid/sub.
      if (sdkReady && typeof window.show_11040287 === "function") {
        const rewardId = crypto.randomUUID();
        await window.show_11040287({ type: "end", ymid: user!.id, requestVar: rewardId });
        const { data: authData } = await supabase.auth.getSession();
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ad-postback?user=${user!.id}&reward_id=${rewardId}&provider=monetag`, {
          headers: { Authorization: `Bearer ${authData.session?.access_token ?? ""}` },
        });
      } else {
        // SDK not loaded — refuse to credit. We never simulate ad watches.
        toast.error(t("ad_failed") + " — " + t("ad_blocked_note"));
        setBusy(false); return;
      }
      // Wait a moment for the postback to land, then refresh.
      await new Promise(r => setTimeout(r, 2500));
      await reload();
      toast.success(t("ad_reward_credited"));
    } catch (e: any) {
      const message = String(e?.message ?? "");
      toast.error(message.toLowerCase().includes("network") ? `${t("ad_failed")} — ${t("ad_blocked_note")}` : (message || t("ad_failed")));
    }
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
