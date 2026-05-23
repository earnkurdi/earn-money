// Public S2S postback from ad networks (Monetag / Adsterra / PropellerAds / offerwalls).
// Configure the ad network's postback URL to:
//   https://<project>.supabase.co/functions/v1/ad-postback
//     ?user=USER_ID&reward_id=UNIQUE_TX_ID&provider=monetag&sig=HMAC_SHA256(user|reward_id|provider, AD_POSTBACK_SECRET)
// We credit the user's balance ONCE per reward_id. Replay attempts are ignored.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function eq(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

async function creditReward(supa: any, req: Request, user: string, rewardId: string, provider: string) {
  if (!user || !rewardId) return new Response("bad-request", { status: 400, headers: cors });

  // Check banned + load reward + check daily cap
  const [{ data: profile }, { data: settings }] = await Promise.all([
    supa.from("profiles").select("is_banned, referred_by").eq("id", user).maybeSingle(),
    supa.from("app_settings").select("*").eq("id", 1).maybeSingle(),
  ]);
  if (!profile) return new Response("no-user", { status: 404, headers: cors });
  if (profile.is_banned) return new Response("banned", { status: 403, headers: cors });

  const startOfDay = new Date(); startOfDay.setUTCHours(0, 0, 0, 0);
  const { count } = await supa.from("ad_watches").select("id", { count: "exact", head: true })
    .eq("user_id", user).gte("created_at", startOfDay.toISOString());
  if ((count ?? 0) >= (settings?.daily_ad_cap ?? 50)) {
    return new Response("daily-cap", { status: 429, headers: cors });
  }

  const reward = Number(settings?.reward_per_ad_usd ?? 0.002);
  const ip = req.headers.get("x-forwarded-for") ?? "";
  const ua = req.headers.get("user-agent") ?? "";

  // Insert idempotently by postback_id (unique constraint)
  const { error: insErr } = await supa.from("ad_watches").insert({
    user_id: user, provider, reward_usd: reward, postback_id: `${provider}:${rewardId}`, ip, user_agent: ua,
  });
  if (insErr) {
    if ((insErr as any).code === "23505") return new Response("duplicate", { status: 200, headers: cors });
    throw insErr;
  }

  // Credit user balance + lifetime
  const { data: bal } = await supa.from("balances").select("*").eq("user_id", user).maybeSingle();
  await supa.from("balances").upsert({
    user_id: user,
    balance_usd: Number(bal?.balance_usd ?? 0) + reward,
    lifetime_earned_usd: Number(bal?.lifetime_earned_usd ?? 0) + reward,
    pending_withdraw_usd: Number(bal?.pending_withdraw_usd ?? 0),
    updated_at: new Date().toISOString(),
  });

  // Referral commission
  if (profile.referred_by) {
    const pct = Number(settings?.referral_percent ?? 10) / 100;
    const bonus = +(reward * pct).toFixed(6);
    if (bonus > 0) {
      const { data: rb } = await supa.from("balances").select("*").eq("user_id", profile.referred_by).maybeSingle();
      await supa.from("balances").upsert({
        user_id: profile.referred_by,
        balance_usd: Number(rb?.balance_usd ?? 0) + bonus,
        lifetime_earned_usd: Number(rb?.lifetime_earned_usd ?? 0) + bonus,
        pending_withdraw_usd: Number(rb?.pending_withdraw_usd ?? 0),
        updated_at: new Date().toISOString(),
      });
      const { data: existing } = await supa.from("referrals").select("id, commission_earned_usd")
        .eq("referrer_id", profile.referred_by).eq("referred_id", user).maybeSingle();
      if (existing) {
        await supa.from("referrals").update({
          commission_earned_usd: Number(existing.commission_earned_usd) + bonus,
        }).eq("id", existing.id);
      }
    }
  }

  // Most ad networks expect a 200 with "1" or "ok"
  return new Response("1", { status: 200, headers: cors });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const secret = Deno.env.get("AD_POSTBACK_SECRET");
    if (!secret) return new Response("server-misconfigured", { status: 500, headers: cors });

    const url = new URL(req.url);
    const user = url.searchParams.get("user") || "";
    const rewardId = url.searchParams.get("reward_id") || "";
    const provider = (url.searchParams.get("provider") || "unknown").toLowerCase();
    const token = url.searchParams.get("token") || "";
    if (!user || !rewardId) return new Response("bad-request", { status: 400, headers: cors });
    if (token && !eq(token, secret)) return new Response("forbidden", { status: 403, headers: cors });

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (!token) {
      const auth = req.headers.get("Authorization") ?? "";
      const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: auth } },
      });
      const { data: { user: authUser } } = await userClient.auth.getUser();
      if (!authUser || authUser.id !== user || provider !== "monetag") return new Response("forbidden", { status: 403, headers: cors });
      return await creditReward(supa, req, user, rewardId, provider);
    }

    return await creditReward(supa, req, user, rewardId, provider);
  } catch (e) {
    console.error("postback error", e);
    return new Response("error", { status: 500, headers: cors });
  }
});
