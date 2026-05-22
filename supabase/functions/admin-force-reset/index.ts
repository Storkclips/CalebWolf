import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function sha256hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the caller is an admin
    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("is_admin")
      .eq("id", caller.id)
      .maybeSingle();

    if (!callerProfile?.is_admin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userId } = await req.json();
    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the target user's email
    const { data: { user: targetUser }, error: userErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userErr || !targetUser?.email) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = targetUser.email;

    // Set force_change_password flag
    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .update({ force_change_password: true, password_reset_required: true })
      .eq("id", userId);

    if (profileErr) {
      return new Response(JSON.stringify({ error: profileErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for Resend API key
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      // Flag was set but can't send email — still a partial success
      return new Response(JSON.stringify({ success: true, emailSent: false }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete any existing unused codes for this email
    await supabaseAdmin.from("password_reset_codes").delete().eq("email", email.toLowerCase());

    // Generate a 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await sha256hex(code);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min for admin-forced resets

    await supabaseAdmin.from("password_reset_codes").insert({
      email: email.toLowerCase(),
      code_hash: codeHash,
      expires_at: expiresAt,
    });

    // Send the email
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Caleb Wolf Photography <admin@calebwolfphotography.com>",
        to: [email],
        subject: "Your account password must be reset",
        html: `
          <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; background: #0a0a10; color: #e8e8e8;">
            <h2 style="margin: 0 0 12px; font-size: 22px; font-weight: 700; color: #fff;">Password reset required</h2>
            <p style="margin: 0 0 24px; font-size: 15px; color: #aaa; line-height: 1.6;">
              Your account has been flagged to require a password reset. Use the code below when prompted at your next login.
              It expires in <strong style="color:#f3d27a;">30 minutes</strong>.
            </p>
            <div style="display:inline-block; background:#1a1a24; border:1px solid #333; border-radius:12px; padding:20px 40px; margin-bottom:28px;">
              <span style="font-size:36px; font-weight:800; letter-spacing:10px; color:#f3d27a; font-family:monospace;">${code}</span>
            </div>
            <p style="margin: 0; font-size: 13px; color: #666;">
              If you didn't expect this, please contact support.
            </p>
          </div>
        `,
      }),
    });

    return new Response(JSON.stringify({ success: true, emailSent: emailRes.ok }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
