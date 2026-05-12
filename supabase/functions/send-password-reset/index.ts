import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { email, redirectTo } = await req.json();

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

    // Generate a password reset link via Supabase Admin API
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: redirectTo || `${Deno.env.get("SUPABASE_URL")}/auth/reset-password`,
      },
    });

    if (linkError) {
      return new Response(
        JSON.stringify({ error: linkError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resetLink = linkData?.properties?.action_link;
    if (!resetLink) {
      return new Response(
        JSON.stringify({ error: "Could not generate reset link" }),
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
        from: "Caleb Wolf Photography <onboarding@resend.dev>",
        to: [email],
        subject: "Reset your password",
        html: `
          <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; background: #0a0a10; color: #e8e8e8;">
            <h2 style="margin: 0 0 12px; font-size: 22px; font-weight: 700; color: #fff;">Reset your password</h2>
            <p style="margin: 0 0 24px; font-size: 15px; color: #aaa; line-height: 1.6;">
              You requested a password reset for your Caleb Wolf Photography account.
              Click the button below to choose a new password.
            </p>
            <a href="${resetLink}"
              style="display: inline-block; background: #f3d27a; color: #0a0a10; font-weight: 700; font-size: 15px;
                     padding: 14px 28px; border-radius: 10px; text-decoration: none; margin-bottom: 28px;">
              Reset Password
            </a>
            <p style="margin: 0; font-size: 13px; color: #666;">
              This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
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
