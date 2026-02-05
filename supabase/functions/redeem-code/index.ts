import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.95.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Not authenticated" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: "Invalid session" }, 401);
    }

    const { code } = await req.json();
    if (!code || typeof code !== "string") {
      return jsonResponse({ error: "Code is required" }, 400);
    }

    const adminClient = createClient(supabaseUrl, serviceKey);
    const normalizedCode = code.toUpperCase().trim();

    const { data: unlockCode, error: codeError } = await adminClient
      .from("unlock_codes")
      .select("*")
      .eq("code", normalizedCode)
      .maybeSingle();

    if (codeError) {
      return jsonResponse({ error: "Failed to look up code" }, 500);
    }

    if (!unlockCode) {
      return jsonResponse({ error: "Invalid code" }, 400);
    }

    if (!unlockCode.is_active) {
      return jsonResponse({ error: "This code has been disabled" }, 400);
    }

    if (
      unlockCode.max_uses > 0 &&
      unlockCode.times_used >= unlockCode.max_uses
    ) {
      return jsonResponse(
        { error: "This code has reached its maximum uses" },
        400,
      );
    }

    if (
      unlockCode.expires_at &&
      new Date(unlockCode.expires_at) < new Date()
    ) {
      return jsonResponse({ error: "This code has expired" }, 400);
    }

    const { data: existing } = await adminClient
      .from("unlocked_collections")
      .select("id")
      .eq("user_id", user.id)
      .eq("collection_id", unlockCode.collection_id)
      .maybeSingle();

    if (existing) {
      return jsonResponse(
        { error: "You already have access to this collection" },
        400,
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
      return jsonResponse({ error: "Failed to unlock collection" }, 500);
    }

    await adminClient
      .from("unlock_codes")
      .update({ times_used: unlockCode.times_used + 1 })
      .eq("id", unlockCode.id);

    const { data: collection } = await adminClient
      .from("admin_collections")
      .select("title")
      .eq("id", unlockCode.collection_id)
      .maybeSingle();

    return jsonResponse({
      success: true,
      collection: collection?.title ?? "Collection",
    });
  } catch (_err) {
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
