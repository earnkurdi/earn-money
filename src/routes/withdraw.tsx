import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/withdraw")({ component: Withdraw });

const METHODS = [
  { id: "usdt_trc20", label: "USDT (TRC20)" },
  { id: "binance_pay", label: "Binance Pay ID" },
  { id: "faucetpay", label: "FaucetPay email" },
] as const;

function Withdraw() {
  const { user, loading } = useAuth();
  const { t, dir } = useT();
  const nav = useNavigate();
  const [balance, setBalance] = useState<any>(null);
  const [min, setMin] = useState(1);
  const [method, setMethod] = useState<typeof METHODS[number]["id"]>("usdt_trc20");
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [loading, user]);

  const load = async () => {
    if (!user) return;
    const [b, s, h] = await Promise.all([
      supabase.from("balances").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("app_settings").select("min_withdraw_usd").eq("id", 1).maybeSingle(),
      supabase.from("withdrawals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
    ]);
    setBalance(b.data); setMin(Number(s.data?.min_withdraw_usd ?? 1)); setHistory(h.data ?? []);
  };
  useEffect(() => { load(); }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("request-withdrawal", {
      body: { method, destination, amount: Number(amount) },
    });
    setBusy(false);
    if (error || (data as any)?.error) toast.error((data as any)?.error || error?.message || "Failed");
    else { toast.success("Requested"); setAmount(""); setDestination(""); load(); }
  };

  return (
    <AppShell>
      <div className="glass rounded-3xl p-5">
        <div className="text-xs text-muted-foreground">{t("balance")}</div>
        <div className="text-3xl font-extrabold text-gradient">${Number(balance?.balance_usd ?? 0).toFixed(4)}</div>
        <p className="text-xs text-muted-foreground">{t("min_withdraw")}: ${min.toFixed(2)}</p>

        <form onSubmit={submit} className="mt-4 space-y-3">
          <div>
            <Label>{t("method")}</Label>
            <select dir={dir} value={method} onChange={(e) => setMethod(e.target.value as any)}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              {METHODS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
          <div><Label>{t("destination")}</Label><Input value={destination} onChange={(e) => setDestination(e.target.value)} required minLength={4} maxLength={120} /></div>
          <div><Label>{t("amount")} (USD)</Label><Input type="number" step="0.01" min={min} value={amount} onChange={(e) => setAmount(e.target.value)} required /></div>
          <Button type="submit" disabled={busy} className="w-full">{busy ? "…" : t("request")}</Button>
        </form>
      </div>

      <div className="mt-5">
        <h3 className="mb-2 text-sm font-semibold">{t("history")}</h3>
        <div className="space-y-2">
          {history.length === 0 && <p className="text-xs text-muted-foreground">{t("no_data")}</p>}
          {history.map(w => (
            <div key={w.id} className="glass flex items-center justify-between rounded-xl p-3 text-sm">
              <div>
                <div className="font-semibold">${Number(w.amount_usd).toFixed(2)} · {w.method}</div>
                <div className="text-xs text-muted-foreground truncate max-w-[180px]">{w.destination}</div>
                {w.txid && <div className="text-[10px] text-primary truncate max-w-[180px]">TX: {w.txid}</div>}
              </div>
              <span className={`text-xs px-2 py-1 rounded-md ${
                w.status === "paid" ? "bg-success/20 text-success" :
                w.status === "rejected" ? "bg-destructive/20 text-destructive" :
                w.status === "approved" ? "bg-primary/20 text-primary" :
                "bg-muted text-muted-foreground"}`}>
                {t(`status_${w.status}` as any)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
