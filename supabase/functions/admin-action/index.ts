import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve_withdrawal"), id: z.string().uuid() }),
  z.object({
    action: z.literal("reject_withdrawal"),
    id: z.string().uuid(),
    note: z.string().max(500).optional(),
  }),
  z.object({
    action: z.literal("mark_paid"),
    id: z.string().uuid(),
    txid: z.string().min(4).max(200),
  }),
  z.object({
    action: z.literal("ban_user"),
    user_id: z.string().uuid(),
    reason: z.string().max(500).optional(),
  }),
  z.object({ action: z.literal("unban_user"), user_id: z.string().uuid() }),
  z.object({
    action: z.literal("update_settings"),
    patch: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])),
  }),
]);

const settingTypes: Record<string, "number" | "string" | "boolean"> = {
  reward_per_ad_usd: "number",
  daily_ad_cap: "number",
  min_withdraw_usd: "number",
  referral_percent: "number",
  daily_bonus_base_usd: "number",
  revenue_share_percent: "number",
  max_postback_reward_usd: "number",
  fallback_offerwall_enabled: "boolean",
  fallback_offerwall_name: "string",
  fallback_offerwall_url: "string",
};

function sanitizeSettingsPatch(patch: Record<string, number | string | boolean>) {
  const next: Record<string, number | string | boolean> = {};
  for (const [key, value] of Object.entries(patch)) {
    const type = settingTypes[key];
    if (!type || typeof value !== type) continue;
    if (type === "number" && (!Number.isFinite(value as number) || (value as number) < 0)) continue;
    if (key === "fallback_offerwall_url") {
      const url = String(value).trim();
      if (url && !url.startsWith("https://")) continue;
      next[key] = url.slice(0, 2000);
      continue;
    }
    if (type === "string") next[key] = String(value).trim().slice(0, 120);
    else next[key] = value;
  }
  return next;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (b: any, s = 200) =>
    new Response(JSON.stringify(b), {
      status: s,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supaUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: auth } },
      },
    );
    const {
      data: { user },
    } = await supaUser.auth.getUser();
    if (!user) return json({ error: "unauth" }, 401);

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: roles } = await supa
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");
    if (!roles || roles.length === 0) return json({ error: "forbidden" }, 403);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: "invalid", details: parsed.error.flatten() }, 400);
    const a = parsed.data;

    if (a.action === "approve_withdrawal") {
      const { error } = await supa
        .from("withdrawals")
        .update({ status: "approved" })
        .eq("id", a.id)
        .eq("status", "pending");
      if (error) throw error;
    }
    if (a.action === "reject_withdrawal") {
      const { data: w } = await supa.from("withdrawals").select("*").eq("id", a.id).maybeSingle();
      if (!w || (w.status !== "pending" && w.status !== "approved"))
        return json({ error: "bad-state" }, 400);
      await supa
        .from("withdrawals")
        .update({ status: "rejected", admin_note: a.note ?? null })
        .eq("id", a.id);
      // refund pending->balance
      const { data: bal } = await supa
        .from("balances")
        .select("*")
        .eq("user_id", w.user_id)
        .maybeSingle();
      await supa
        .from("balances")
        .update({
          balance_usd: Number(bal!.balance_usd) + Number(w.amount_usd),
          pending_withdraw_usd: Math.max(
            0,
            Number(bal!.pending_withdraw_usd) - Number(w.amount_usd),
          ),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", w.user_id);
    }
    if (a.action === "mark_paid") {
      const { data: w } = await supa.from("withdrawals").select("*").eq("id", a.id).maybeSingle();
      if (!w || w.status !== "approved") return json({ error: "bad-state" }, 400);
      await supa.from("withdrawals").update({ status: "paid", txid: a.txid }).eq("id", a.id);
      const { data: bal } = await supa
        .from("balances")
        .select("*")
        .eq("user_id", w.user_id)
        .maybeSingle();
      await supa
        .from("balances")
        .update({
          pending_withdraw_usd: Math.max(
            0,
            Number(bal!.pending_withdraw_usd) - Number(w.amount_usd),
          ),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", w.user_id);
    }
    if (a.action === "ban_user") {
      await supa
        .from("profiles")
        .update({ is_banned: true, ban_reason: a.reason ?? null })
        .eq("id", a.user_id);
    }
    if (a.action === "unban_user") {
      await supa
        .from("profiles")
        .update({ is_banned: false, ban_reason: null })
        .eq("id", a.user_id);
    }
    if (a.action === "update_settings") {
      const patch = sanitizeSettingsPatch(a.patch);
      if (Object.keys(patch).length === 0) return json({ error: "invalid-settings" }, 400);
      await supa
        .from("app_settings")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", 1);
    }

    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});
