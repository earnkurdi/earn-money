import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve_withdrawal"), id: z.string().uuid() }),
  z.object({ action: z.literal("reject_withdrawal"), id: z.string().uuid(), note: z.string().max(500).optional() }),
  z.object({ action: z.literal("mark_paid"), id: z.string().uuid(), txid: z.string().min(4).max(200) }),
  z.object({ action: z.literal("ban_user"), user_id: z.string().uuid(), reason: z.string().max(500).optional() }),
  z.object({ action: z.literal("unban_user"), user_id: z.string().uuid() }),
  z.object({ action: z.literal("update_settings"), patch: z.record(z.string(), z.number()) }),
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (b: any, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supaUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await supaUser.auth.getUser();
    if (!user) return json({ error: "unauth" }, 401);

    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roles } = await supa.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin");
    if (!roles || roles.length === 0) return json({ error: "forbidden" }, 403);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: "invalid", details: parsed.error.flatten() }, 400);
    const a = parsed.data;

    if (a.action === "approve_withdrawal") {
      const { error } = await supa.from("withdrawals").update({ status: "approved" }).eq("id", a.id).eq("status", "pending");
      if (error) throw error;
    }
    if (a.action === "reject_withdrawal") {
      const { data: w } = await supa.from("withdrawals").select("*").eq("id", a.id).maybeSingle();
      if (!w || (w.status !== "pending" && w.status !== "approved")) return json({ error: "bad-state" }, 400);
      await supa.from("withdrawals").update({ status: "rejected", admin_note: a.note ?? null }).eq("id", a.id);
      // refund pending->balance
      const { data: bal } = await supa.from("balances").select("*").eq("user_id", w.user_id).maybeSingle();
      await supa.from("balances").update({
        balance_usd: Number(bal!.balance_usd) + Number(w.amount_usd),
        pending_withdraw_usd: Math.max(0, Number(bal!.pending_withdraw_usd) - Number(w.amount_usd)),
        updated_at: new Date().toISOString(),
      }).eq("user_id", w.user_id);
    }
    if (a.action === "mark_paid") {
      const { data: w } = await supa.from("withdrawals").select("*").eq("id", a.id).maybeSingle();
      if (!w || w.status !== "approved") return json({ error: "bad-state" }, 400);
      await supa.from("withdrawals").update({ status: "paid", txid: a.txid }).eq("id", a.id);
      const { data: bal } = await supa.from("balances").select("*").eq("user_id", w.user_id).maybeSingle();
      await supa.from("balances").update({
        pending_withdraw_usd: Math.max(0, Number(bal!.pending_withdraw_usd) - Number(w.amount_usd)),
        updated_at: new Date().toISOString(),
      }).eq("user_id", w.user_id);
    }
    if (a.action === "ban_user") {
      await supa.from("profiles").update({ is_banned: true, ban_reason: a.reason ?? null }).eq("id", a.user_id);
    }
    if (a.action === "unban_user") {
      await supa.from("profiles").update({ is_banned: false, ban_reason: null }).eq("id", a.user_id);
    }
    if (a.action === "update_settings") {
      await supa.from("app_settings").update({ ...a.patch, updated_at: new Date().toISOString() }).eq("id", 1);
    }

    return json({ ok: true });
  } catch (e) { console.error(e); return json({ error: String(e) }, 500); }
});
