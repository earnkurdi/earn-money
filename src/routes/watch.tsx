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

function createRewardId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

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
  const [adHistory, setAdHistory] = useState<any[]>([]);

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [loading, user]);
  useEffect(() => { if (user) void loadMonetagSdk(); }, [user]);

  const reload = useCallback(async () => {
    if (!user) return;
    const [s, w, h] = await Promise.all([
      supabase.from("app_settings").select("reward_per_ad_usd, daily_ad_cap").eq("id", 1).maybeSingle(),
      supabase.from("ad_watches").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).gte("created_at", new Date(new Date().setHours(0,0,0,0)).toISOString()),
      supabase.from("ad_watches").select("id, provider, reward_usd, postback_id, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    ]);
    setPerAd(Number(s.data?.reward_per_ad_usd ?? 0)); setCap(s.data?.daily_ad_cap ?? 50); setAdsToday(w.count ?? 0);
    setAdHistory(h.data ?? []);
  }, [user]);
  useEffect(() => { reload(); }, [user]);

  const watch = async () => {
    if (adsToday >= cap) { toast.error(t("daily_limit_hit")); return; }
    setBusy(true);
    try {
      const sdkReady = await loadMonetagSdk();
      if (!sdkReady || typeof window.show_11040287 !== "function") { toast.error(t("ad_sdk_unavailable")); return; }
      const rewardId = createRewardId();
      console.log("[Earn][Monetag] ad requested", { zone: MONETAG_ZONE, userId: user!.id, rewardId });
      const result = await window.show_11040287({ type: "end", ymid: user!.id, requestVar: rewardId, catchIfNoFeed: true });
      console.log("[Earn][Monetag] ad opened/finished", { zone: MONETAG_ZONE, rewardId, result });
      if (result?.reward_event_type && result.reward_event_type !== "valued") { toast.error(t("ad_unavailable")); return; }

      const { data: authData } = await supabase.auth.getSession();
      const token = authData.session?.access_token;
      if (!token) throw new Error("Missing user session");
      const backendRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ad-postback?user=${encodeURIComponent(user!.id)}&reward_id=${encodeURIComponent(rewardId)}&provider=monetag`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const backendText = await backendRes.text();
      console.log("[Earn][Monetag] backend response", { rewardId, status: backendRes.status, body: backendText });
      if (!backendRes.ok) throw new Error(backendText || t("reward_credit_failed"));
      const { data: saved, error: savedError } = await supabase.from("ad_watches").select("id, reward_usd").eq("user_id", user!.id).eq("postback_id", `monetag:${rewardId}`).maybeSingle();
      if (savedError || !saved) throw new Error(t("reward_credit_failed"));
      console.log("[Earn][Monetag] reward credited", { rewardId, rewardUsd: saved.reward_usd, adWatchId: saved.id });
      await reload();
      toast.success(t("ad_reward_credited"));
    } catch (e: any) {
      console.error("[Earn][Monetag] ad flow failed", e);
      const message = String(e?.message ?? "");
      toast.error(message.toLowerCase().includes("network") || message.toLowerCase().includes("no feed") || message.toLowerCase().includes("failed to fetch") ? t("ad_unavailable") : (message || t("ad_failed")));
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

      <div className="mt-5">
        <h3 className="mb-2 text-sm font-semibold">{t("ad_history")}</h3>
        <div className="space-y-2">
          {adHistory.length === 0 && <p className="text-xs text-muted-foreground">{t("no_data")}</p>}
          {adHistory.map((ad) => (
            <div key={ad.id} className="glass flex items-center justify-between rounded-xl p-3 text-sm">
              <div>
                <div className="font-semibold">${Number(ad.reward_usd).toFixed(4)} · {ad.provider}</div>
                <div className="text-[10px] text-muted-foreground">{new Date(ad.created_at).toLocaleString()}</div>
              </div>
              <span className="rounded-md bg-success/20 px-2 py-1 text-xs text-success">OK</span>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
