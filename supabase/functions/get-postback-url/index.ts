// Returns real ad-network postback URLs (including secret token) to admin users only.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const supa = createClient(supaUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userClient = createClient(supaUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user)
      return new Response(JSON.stringify({ error: "unauth" }), {
        status: 401,
        headers: { ...cors, "content-type": "application/json" },
      });

    const { data: roles } = await supa.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin)
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...cors, "content-type": "application/json" },
      });

    const secret = Deno.env.get("AD_POSTBACK_SECRET") ?? "";
    const base = `${supaUrl}/functions/v1/ad-postback`;
    const monetagUrl = `${base}?user={ymid}&reward_id={request_var}&provider=monetag&reward_event_type={reward_event_type}&token=${secret}`;
    const offerwallUrl = `${base}?user={user_id}&reward_id={transaction_id}&provider=offerwall&reward={amount}&token=${secret}`;
    return new Response(JSON.stringify({ url: monetagUrl, monetagUrl, offerwallUrl }), {
      headers: { ...cors, "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...cors, "content-type": "application/json" },
    });
  }
});
