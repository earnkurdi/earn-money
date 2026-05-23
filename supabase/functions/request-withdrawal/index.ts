import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const Body = z.object({
  method: z.enum(["usdt_trc20", "binance_pay", "faucetpay"]),
  destination: z.string().trim().min(4).max(120),
  amount: z.number().positive().max(10000),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (b: any, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supaUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await supaUser.auth.getUser();
    if (!user) return json({ error: "unauth" }, 401);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: "invalid", details: parsed.error.flatten() }, 400);
    const { method, destination, amount } = parsed.data;

    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const [{ data: profile }, { data: bal }, { data: settings }] = await Promise.all([
      supa.from("profiles").select("is_banned").eq("id", user.id).maybeSingle(),
      supa.from("balances").select("*").eq("user_id", user.id).maybeSingle(),
      supa.from("app_settings").select("min_withdraw_usd").eq("id", 1).maybeSingle(),
    ]);
    if (profile?.is_banned) return json({ error: "banned" }, 403);
    const min = Number(settings?.min_withdraw_usd ?? 1);
    if (amount < min) return json({ error: `min ${min}` }, 400);
    if (Number(bal?.balance_usd ?? 0) < amount) return json({ error: "insufficient" }, 400);

    // Move balance -> pending
    await supa.from("balances").update({
      balance_usd: Number(bal!.balance_usd) - amount,
      pending_withdraw_usd: Number(bal!.pending_withdraw_usd) + amount,
      updated_at: new Date().toISOString(),
    }).eq("user_id", user.id);

    const { data: w, error } = await supa.from("withdrawals").insert({
      user_id: user.id, method, destination, amount_usd: amount,
    }).select().maybeSingle();
    if (error) throw error;
    return json({ ok: true, withdrawal: w });
  } catch (e) { console.error(e); return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } }); }
});
