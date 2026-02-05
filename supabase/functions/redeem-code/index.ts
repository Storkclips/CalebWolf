import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.95.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { code } = await req.json();
    if (!code || typeof code !== "string") {
      return new Response(
        JSON.stringify({ error: "Code is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: unlockCode, error: codeError } = await adminClient
      .from("unlock_codes")
      .select("*, admin_collections(id, title)")
      .eq("code", code.toUpperCase().trim())
      .maybeSingle();

    if (codeError || !unlockCode) {
      return new Response(
        JSON.stringify({ error: "Invalid code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!unlockCode.is_active) {
      return new Response(
        JSON.stringify({ error: "This code has been disabled" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (unlockCode.max_uses > 0 && unlockCode.times_used >= unlockCode.max_uses) {
      return new Response(
        JSON.stringify({ error: "This code has reached its maximum uses" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (unlockCode.expires_at && new Date(unlockCode.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "This code has expired" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: existing } = await adminClient
      .from("unlocked_collections")
      .select("id")
      .eq("user_id", user.id)
      .eq("collection_id", unlockCode.collection_id)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: "You already have access to this collection" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: insertError } = await adminClient
      .from("unlocked_collections")
      .insert({
        user_id: user.id,
        collection_id: unlockCode.collection_id,
        unlock_code_id: unlockCode.id,
      });

    if (insertError) {
      return new Response(
        JSON.stringify({ error: "Failed to unlock collection" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await adminClient
      .from("unlock_codes")
      .update({ times_used: unlockCode.times_used + 1 })
      .eq("id", unlockCode.id);

    return new Response(
      JSON.stringify({
        success: true,
        collection: unlockCode.admin_collections?.title ?? "Collection",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
