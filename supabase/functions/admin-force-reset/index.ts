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

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
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

    const { userId, siteOrigin } = await req.json();
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

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ success: true, emailSent: false }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete any existing unused codes for this email
    await supabaseAdmin.from("password_reset_codes").delete().eq("email", email.toLowerCase());

    // Generate a secure random token (used as the reset link token)
    const token = randomHex(32); // 64-char hex string
    const tokenHash = await sha256hex(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    await supabaseAdmin.from("password_reset_codes").insert({
      email: email.toLowerCase(),
      code_hash: tokenHash,
      expires_at: expiresAt,
    });

    // Build the reset link
    const origin = siteOrigin || "https://calebwolfphotography.com";
    const resetLink = `${origin}/auth/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

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
              Your account has been flagged to require a password reset by an administrator.
              Click the button below to choose a new password. This link expires in <strong style="color:#f3d27a;">1 hour</strong>.
            </p>
            <a href="${resetLink}"
               style="display:inline-block; background:#f3d27a; color:#0a0a10; font-weight:700; font-size:15px;
                      padding:14px 32px; border-radius:8px; text-decoration:none; margin-bottom:28px;">
              Reset My Password
            </a>
            <p style="margin: 0 0 8px; font-size: 13px; color: #666;">
              Or copy and paste this link into your browser:
            </p>
            <p style="margin: 0; font-size: 12px; color: #555; word-break: break-all;">
              ${resetLink}
            </p>
            <p style="margin: 24px 0 0; font-size: 13px; color: #666;">
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
