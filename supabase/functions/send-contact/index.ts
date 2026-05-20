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
    const { name, email, date, location, service, message } = await req.json();

    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({ error: "Name, email, and message are required" }),
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

    // Fetch admin notification email from settings
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: settings } = await supabaseAdmin
      .from("contact_settings")
      .select("admin_email")
      .maybeSingle();

    const adminEmail = settings?.admin_email || "admin@calebwolfphotography.com";

    const dateStr = date ? new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "Not specified";

    // 1. Send confirmation to client
    const clientEmailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Caleb Wolf Photography <admin@calebwolfphotography.com>",
        to: [email],
        subject: "Thanks for your inquiry — Caleb Wolf Photography",
        html: `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; background: #0a0a10; color: #e8e8e8;">
            <h2 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: #fff;">Hi ${name},</h2>
            <p style="margin: 0 0 24px; font-size: 15px; color: #aaa; line-height: 1.6;">
              Thank you for reaching out! I've received your inquiry and will be in touch within one business day.
            </p>
            <div style="background: #14141e; border: 1px solid #2a2a3a; border-radius: 12px; padding: 20px 24px; margin-bottom: 28px;">
              <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 700; color: #fff; text-transform: uppercase; letter-spacing: 0.08em;">Your inquiry summary</h3>
              ${service ? `<p style="margin: 0 0 8px; font-size: 14px; color: #aaa;"><strong style="color: #e8e8e8;">Service:</strong> ${service}</p>` : ""}
              ${date ? `<p style="margin: 0 0 8px; font-size: 14px; color: #aaa;"><strong style="color: #e8e8e8;">Date:</strong> ${dateStr}</p>` : ""}
              ${location ? `<p style="margin: 0 0 8px; font-size: 14px; color: #aaa;"><strong style="color: #e8e8e8;">Location:</strong> ${location}</p>` : ""}
              <p style="margin: 0; font-size: 14px; color: #aaa;"><strong style="color: #e8e8e8;">Message:</strong> ${message}</p>
            </div>
            <p style="margin: 0 0 8px; font-size: 13px; color: #666;">
              In the meantime, feel free to browse my portfolio at
              <a href="https://calebwolfphotography.com" style="color: #f3d27a; text-decoration: none;">calebwolfphotography.com</a>.
            </p>
            <p style="margin: 0; font-size: 13px; color: #555;">— Caleb Wolf Photography</p>
          </div>
        `,
      }),
    });

    // 2. Send notification to admin
    const adminEmailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Caleb Wolf Photography <admin@calebwolfphotography.com>",
        to: [adminEmail],
        reply_to: email,
        subject: `New inquiry from ${name}${service ? ` — ${service}` : ""}`,
        html: `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; background: #0a0a10; color: #e8e8e8;">
            <h2 style="margin: 0 0 4px; font-size: 20px; font-weight: 700; color: #fff;">New contact inquiry</h2>
            <p style="margin: 0 0 28px; font-size: 13px; color: #666;">Received from your website contact form</p>
            <div style="background: #14141e; border: 1px solid #2a2a3a; border-radius: 12px; padding: 20px 24px; margin-bottom: 20px;">
              <p style="margin: 0 0 10px; font-size: 14px; color: #aaa;"><strong style="color: #e8e8e8;">Name:</strong> ${name}</p>
              <p style="margin: 0 0 10px; font-size: 14px; color: #aaa;"><strong style="color: #e8e8e8;">Email:</strong> <a href="mailto:${email}" style="color: #f3d27a;">${email}</a></p>
              ${service ? `<p style="margin: 0 0 10px; font-size: 14px; color: #aaa;"><strong style="color: #e8e8e8;">Service:</strong> ${service}</p>` : ""}
              ${date ? `<p style="margin: 0 0 10px; font-size: 14px; color: #aaa;"><strong style="color: #e8e8e8;">Event date:</strong> ${dateStr}</p>` : ""}
              ${location ? `<p style="margin: 0 0 10px; font-size: 14px; color: #aaa;"><strong style="color: #e8e8e8;">Location:</strong> ${location}</p>` : ""}
              <p style="margin: 0; font-size: 14px; color: #aaa;"><strong style="color: #e8e8e8;">Message:</strong><br/>${message.replace(/\n/g, "<br/>")}</p>
            </div>
            <a href="mailto:${email}" style="display: inline-block; background: #f3d27a; color: #0a0a10; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
              Reply to ${name}
            </a>
          </div>
        `,
      }),
    });

    if (!clientEmailRes.ok || !adminEmailRes.ok) {
      const body = await (!clientEmailRes.ok ? clientEmailRes : adminEmailRes).text();
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
