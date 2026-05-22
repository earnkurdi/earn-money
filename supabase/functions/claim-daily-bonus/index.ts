import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supaUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await supaUser.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauth" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: profile } = await supa.from("profiles").select("is_banned").eq("id", user.id).maybeSingle();
    if (profile?.is_banned) return new Response(JSON.stringify({ error: "banned" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });

    const today = new Date().toISOString().slice(0, 10);
    const { data: existing } = await supa.from("daily_bonus_claims").select("*").eq("user_id", user.id).eq("claim_date", today).maybeSingle();
    if (existing) return new Response(JSON.stringify({ error: "already" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

    const { data: last } = await supa.from("daily_bonus_claims").select("*").eq("user_id", user.id).order("claim_date", { ascending: false }).limit(1);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const streak = last?.[0]?.claim_date === yesterday ? Number(last[0].streak_day) + 1 : 1;

    const { data: settings } = await supa.from("app_settings").select("daily_bonus_base_usd").eq("id", 1).maybeSingle();
    const base = Number(settings?.daily_bonus_base_usd ?? 0.01);
    const amount = +(base * Math.min(streak, 7)).toFixed(6);

    await supa.from("daily_bonus_claims").insert({ user_id: user.id, claim_date: today, amount_usd: amount, streak_day: streak });

    const { data: bal } = await supa.from("balances").select("*").eq("user_id", user.id).maybeSingle();
    await supa.from("balances").upsert({
      user_id: user.id,
      balance_usd: Number(bal?.balance_usd ?? 0) + amount,
      lifetime_earned_usd: Number(bal?.lifetime_earned_usd ?? 0) + amount,
      pending_withdraw_usd: Number(bal?.pending_withdraw_usd ?? 0),
      updated_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ amount, streak }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
