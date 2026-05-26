import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { PlayCircle, RefreshCw, ShieldCheck } from "lucide-react";
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
  zone_id?: number;
  sub_zone_id?: number;
};

declare global { interface Window { show_11040287?: (opts?: any) => Promise<MonetagResult>; } }

const MONETAG_ZONE = "11040287";
const SDK_SELECTOR = `script[data-sdk="show_${MONETAG_ZONE}"]`;
const AD_ATTEMPTS: Array<{ label: string; options: Record<string, unknown> }> = [
  { label: "rewarded-interstitial", options: { type: "end" } },
  { label: "rewarded-popup", options: { type: "pop" } },
  { label: "default", options: {} },
];

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
      if (existing.dataset.failed === "true") existing.remove();
      else {
      if (existing.dataset.loaded === "true" || existing.dataset.failed === "true") {
        resolve();
        return;
      }
      existing.addEventListener("load", () => { existing.dataset.loaded = "true"; resolve(); }, { once: true });
      existing.addEventListener("error", () => { existing.dataset.failed = "true"; resolve(); }, { once: true });
      setTimeout(resolve, 6000);
      return;
      }
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

function isEmptyFeedError(error: unknown) {
  const message = String((error as any)?.message ?? error ?? "").toLowerCase();
  return message.includes("empty feed") || message.includes("no feed") || message.includes("no ad") || message.includes("feed");
}

async function waitForServerPostback(userId: string, rewardId: string) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { data, error } = await supabase
      .from("ad_watches")
      .select("id, reward_usd")
      .eq("user_id", userId)
      .eq("postback_id", `monetag:${rewardId}`)
      .maybeSingle();
    if (data) return data;
    if (error) throw error;
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  return null;
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
  const [status, setStatus] = useState<string>("");

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
    setStatus(t("ad_loading_provider"));
    try {
      const sdkReady = await loadMonetagSdk();
      if (!sdkReady || typeof window.show_11040287 !== "function") { toast.error(t("ad_sdk_unavailable")); return; }
      const rewardId = createRewardId();
      console.log("[Earn][Monetag] ad requested", { zone: MONETAG_ZONE, userId: user!.id, rewardId });
      let result: MonetagResult | undefined;
      let shown = false;
      const errors: string[] = [];
      for (const attempt of AD_ATTEMPTS) {
        try {
          setStatus(t("ad_opening"));
          result = await window.show_11040287({ ...attempt.options, ymid: user!.id, requestVar: rewardId, catchIfNoFeed: true, timeout: 30000 });
          shown = true;
          console.log("[Earn][Monetag] ad attempt finished", { zone: MONETAG_ZONE, rewardId, attempt: attempt.label, result });
          break;
        } catch (error) {
          const message = String((error as any)?.message ?? error ?? attempt.label);
          errors.push(`${attempt.label}: ${message}`);
          console.warn("[Earn][Monetag] ad attempt failed", { zone: MONETAG_ZONE, rewardId, attempt: attempt.label, error });
          if (!isEmptyFeedError(error)) break;
        }
      }
      if (!shown) {
        console.warn("[Earn][Monetag] all real ad formats unavailable", { zone: MONETAG_ZONE, rewardId, errors });
        toast.error(t("ad_inventory_empty"));
        setStatus(t("ad_inventory_empty"));
        return;
      }
      if (result?.reward_event_type === "non_valued") { toast.error(t("ad_not_paid")); setStatus(t("ad_not_paid")); return; }

      setStatus(t("ad_verifying_reward"));
      const saved = await waitForServerPostback(user!.id, rewardId);
      if (!saved) throw new Error(t("ad_postback_missing"));
      console.log("[Earn][Monetag] reward credited", { rewardId, rewardUsd: saved.reward_usd, adWatchId: saved.id });
      await reload();
      setStatus("");
      toast.success(t("ad_reward_credited"));
    } catch (e: any) {
      console.error("[Earn][Monetag] ad flow failed", e);
      const message = String(e?.message ?? "");
      const safeMessage = message.toLowerCase().includes("network") || message.toLowerCase().includes("no feed") || message.toLowerCase().includes("empty feed") || message.toLowerCase().includes("failed to fetch") ? t("ad_inventory_empty") : (message || t("ad_failed"));
      setStatus(safeMessage);
      toast.error(safeMessage);
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
          {busy ? <RefreshCw className="size-5 animate-spin" /> : <PlayCircle className="size-5" />} {busy ? t("watching") : t("watch_ad")}
        </Button>
        {status && <p className="mt-3 text-xs text-muted-foreground">{status}</p>}

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
