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
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the email actually belongs to a user (silent fail to prevent enumeration)
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = users.some(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!userExists) {
      // Return success anyway to prevent email enumeration
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete any existing unused codes for this email
    await supabaseAdmin
      .from("password_reset_codes")
      .delete()
      .eq("email", email.toLowerCase());

    // Generate a 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await sha256hex(code);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { error: insertError } = await supabaseAdmin
      .from("password_reset_codes")
      .insert({ email: email.toLowerCase(), code_hash: codeHash, expires_at: expiresAt });

    if (insertError) {
      return new Response(
        JSON.stringify({ error: "Failed to create reset code" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send via Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Caleb Wolf Photography <admin@calebwolfphotography.com>",
        to: [email],
        subject: "Your password reset code",
        html: `
          <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; background: #0a0a10; color: #e8e8e8;">
            <h2 style="margin: 0 0 12px; font-size: 22px; font-weight: 700; color: #fff;">Password reset code</h2>
            <p style="margin: 0 0 24px; font-size: 15px; color: #aaa; line-height: 1.6;">
              Use the code below to reset your Caleb Wolf Photography account password.
              It expires in <strong style="color:#f3d27a;">5 minutes</strong>.
            </p>
            <div style="display:inline-block; background:#1a1a24; border:1px solid #333; border-radius:12px; padding:20px 40px; margin-bottom:28px;">
              <span style="font-size:36px; font-weight:800; letter-spacing:10px; color:#f3d27a; font-family:monospace;">${code}</span>
            </div>
            <p style="margin: 0; font-size: 13px; color: #666;">
              If you didn't request this, you can safely ignore this email.
            </p>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const body = await emailResponse.text();
      return new Response(
        JSON.stringify({ error: `Email send failed: ${body}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
