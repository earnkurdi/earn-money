import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({ component: Admin });

function Admin() {
  const { user, isAdmin, loading } = useAuth();
  const { t } = useT();
  const nav = useNavigate();
  const [stats, setStats] = useState<any>({});
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [txids, setTxids] = useState<Record<string, string>>({});
  const [bootBusy, setBootBusy] = useState(false);
  const [postbackUrl, setPostbackUrl] = useState<string>("");
  const [showUrl, setShowUrl] = useState(false);

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [loading, user]);

  const load = async () => {
    const [u, ai, p, w, s] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("ad_watches").select("reward_usd"),
      supabase.from("withdrawals").select("amount_usd, status"),
      supabase.from("withdrawals").select("*, profiles!inner(username,is_banned)").order("created_at", { ascending: false }).limit(50),
      supabase.from("app_settings").select("*").eq("id", 1).maybeSingle(),
    ]);
    const ads = ai.data ?? [];
    setStats({
      users: u.count ?? 0,
      impressions: ads.length,
      revenue: ads.reduce((a: number, r: any) => a + Number(r.reward_usd), 0) / (Number(s.data?.revenue_share_percent ?? 60) / 100),
      paid: (p.data ?? []).filter((x: any) => x.status === "paid").reduce((a: number, x: any) => a + Number(x.amount_usd), 0),
    });
    setWithdrawals(w.data ?? []); setSettings(s.data);
  };
  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    supabase.functions.invoke("get-postback-url").then(({ data }) => {
      if ((data as any)?.url) setPostbackUrl((data as any).url);
    });
  }, [isAdmin]);

  const copyUrl = async () => {
    try { await navigator.clipboard.writeText(postbackUrl); toast.success("Copied!"); }
    catch { toast.error("Copy failed — long-press to select"); }
  };

  const bootstrap = async () => {
    setBootBusy(true);
    const { data, error } = await supabase.functions.invoke("bootstrap-admin");
    setBootBusy(false);
    if (error || (data as any)?.error) toast.error((data as any)?.error || error?.message || "Failed");
    else { toast.success("You are admin. Reloading…"); setTimeout(() => location.reload(), 800); }
  };

  const action = async (body: any) => {
    const { data, error } = await supabase.functions.invoke("admin-action", { body });
    if (error || (data as any)?.error) toast.error((data as any)?.error || error?.message);
    else { toast.success("OK"); load(); }
  };

  if (loading) return <AppShell><p className="text-center text-muted-foreground">{t("loading")}</p></AppShell>;

  if (!isAdmin) {
    return (
      <AppShell>
        <div className="glass mt-6 rounded-2xl p-6 text-center">
          <h2 className="text-lg font-bold">{t("admin")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">If no admin exists yet, claim it now.</p>
          <Button onClick={bootstrap} disabled={bootBusy} className="mt-4">Claim admin</Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="grid grid-cols-2 gap-3">
        {[
          ["total_users", stats.users],
          ["total_impressions", stats.impressions],
          ["revenue", `$${(stats.revenue ?? 0).toFixed(2)}`],
          ["total_payouts", `$${(stats.paid ?? 0).toFixed(2)}`],
        ].map(([k, v]) => (
          <div key={k as string} className="glass rounded-2xl p-4">
            <div className="text-xs text-muted-foreground">{t(k as any)}</div>
            <div className="mt-1 text-xl font-bold">{v as any}</div>
          </div>
        ))}
      </div>

      </div>

      <div className="mt-5 glass rounded-2xl p-4 border border-primary/30">
        <h3 className="text-sm font-semibold flex items-center gap-2">🎯 Monetag Setup <span className="text-[10px] px-2 py-0.5 rounded bg-primary/20 text-primary">REQUIRED</span></h3>
        <p className="mt-2 text-xs text-muted-foreground">Without this step, watching ads will NOT add balance. Do this once and you're done forever.</p>
        <ol className="mt-3 space-y-2 text-xs list-decimal list-inside text-muted-foreground">
          <li>Open <a className="text-primary underline" href="https://monetag.com/" target="_blank" rel="noreferrer">monetag.com</a> → log in → <b>Sites & Zones</b>.</li>
          <li>Click your zone <b>11040287</b> → scroll to <b>Postback URL</b> (or <b>S2S Postback</b>).</li>
          <li>Paste the URL below into that field and <b>Save</b>.</li>
          <li>Come back here, open <b>/watch</b>, watch one ad, and confirm your balance went up.</li>
        </ol>
        <div className="mt-3 flex gap-2">
          <Input
            readOnly
            value={postbackUrl ? (showUrl ? postbackUrl : postbackUrl.replace(/token=[^&]+/, "token=••••••••")) : "Loading…"}
            className="font-mono text-[10px]"
            onFocus={(e) => e.currentTarget.select()}
          />
          <Button size="sm" variant="outline" onClick={() => setShowUrl(s => !s)}>{showUrl ? "Hide" : "Show"}</Button>
          <Button size="sm" onClick={copyUrl} disabled={!postbackUrl}>Copy</Button>
        </div>
        <p className="mt-2 text-[10px] text-amber-400/80">⚠️ This URL contains your secret token. Never share it publicly — only paste into Monetag's dashboard.</p>
      </div>

      {settings && (
        <div className="mt-5 glass rounded-2xl p-4">
          <h3 className="mb-3 text-sm font-semibold">{t("settings")}</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              ["reward_per_ad_usd", "Per ad $"],
              ["daily_ad_cap", "Daily cap"],
              ["min_withdraw_usd", "Min withdraw $"],
              ["referral_percent", "Referral %"],
              ["daily_bonus_base_usd", "Daily bonus $"],
              ["revenue_share_percent", "Rev share %"],
            ].map(([k, label]) => (
              <label key={k as string} className="text-xs">
                <span className="text-muted-foreground">{label as string}</span>
                <Input className="mt-1" defaultValue={settings[k as string]}
                  onBlur={(e) => action({ action: "update_settings", patch: { [k as string]: Number(e.target.value) } })} />
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5">
        <h3 className="mb-2 text-sm font-semibold">Withdrawals</h3>
        <div className="space-y-2">
          {withdrawals.map(w => (
            <div key={w.id} className="glass rounded-2xl p-3 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">${Number(w.amount_usd).toFixed(2)} · {w.method}</div>
                  <div className="text-xs text-muted-foreground">@{w.profiles?.username} · {w.destination}</div>
                  {w.txid && <div className="text-[10px] text-primary">TX: {w.txid}</div>}
                </div>
                <span className="text-xs px-2 py-1 rounded-md bg-muted">{w.status}</span>
              </div>
              {w.status === "pending" && (
                <div className="mt-2 flex gap-2">
                  <Button size="sm" onClick={() => action({ action: "approve_withdrawal", id: w.id })}>{t("approve")}</Button>
                  <Button size="sm" variant="destructive" onClick={() => action({ action: "reject_withdrawal", id: w.id })}>{t("reject")}</Button>
                </div>
              )}
              {w.status === "approved" && (
                <div className="mt-2 flex gap-2">
                  <Input placeholder="TXID" value={txids[w.id] || ""} onChange={(e) => setTxids(s => ({ ...s, [w.id]: e.target.value }))} />
                  <Button size="sm" onClick={() => action({ action: "mark_paid", id: w.id, txid: txids[w.id] })}>{t("mark_paid")}</Button>
                </div>
              )}
              <div className="mt-2 flex gap-2">
                {!w.profiles?.is_banned
                  ? <Button size="sm" variant="outline" onClick={() => action({ action: "ban_user", user_id: w.user_id, reason: "admin" })}>{t("ban")}</Button>
                  : <Button size="sm" variant="outline" onClick={() => action({ action: "unban_user", user_id: w.user_id })}>{t("unban")}</Button>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
