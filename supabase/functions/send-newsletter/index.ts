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
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_admin")
      .eq("id", caller.id)
      .maybeSingle();

    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: "Forbidden — admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { subject, htmlBody, testEmail, scheduleFor } = body;

    if (!subject || !htmlBody) {
      return new Response(JSON.stringify({ error: "Subject and body are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rewrite Supabase storage image URLs to go through the image-proxy
    // edge function, which serves images with Content-Disposition: inline
    // so email clients don't show a download button.
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const rewriteImages = (html: string) => {
      return html.replace(
        /(<img\s+[^>]*src=")(https:\/\/[^"\/]+\.supabase\.co\/storage\/v1\/object\/public\/gallery\/)([^"]+)(")/gi,
        (_m, prefix, _storageUrl, path, quote) => {
          return `${prefix}${supabaseUrl}/functions/v1/image-proxy?path=${encodeURIComponent(path)}${quote}`;
        },
      );
    };

    const processedHtml = rewriteImages(htmlBody);

    const wrappedHtml = `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; background: #0a0a10; color: #e8e8e8;">
        ${processedHtml}
        <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #2a2a3a;">
          <p style="margin: 0; font-size: 12px; color: #555;">
            You're receiving this because you subscribed to the Caleb Wolf Photography newsletter.
          </p>
        </div>
      </div>
    `;

    // Mode 1: Send a test/preview email to a single address
    if (testEmail) {
      const testRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Caleb Wolf Photography <admin@calebwolfphotography.com>",
          to: [testEmail],
          subject: `[PREVIEW] ${subject}`,
          html: wrappedHtml,
        }),
      });

      if (!testRes.ok) {
        const errBody = await testRes.text();
        return new Response(JSON.stringify({ error: `Preview send failed: ${errBody}` }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, preview: true, sentTo: testEmail }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode 2: Schedule the email for later
    if (scheduleFor) {
      const { error: insertErr } = await supabaseAdmin.from("newsletter_scheduled").insert({
        subject,
        html_body: htmlBody,
        scheduled_for: scheduleFor,
        status: "pending",
        created_by: caller.id,
      });

      if (insertErr) {
        return new Response(JSON.stringify({ error: `Failed to schedule: ${insertErr.message}` }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, scheduled: true, scheduledFor }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode 3: Send immediately to all active subscribers
    const { data: subs } = await supabaseAdmin
      .from("newsletter_subscribers")
      .select("email")
      .eq("unsubscribed", false);

    const recipients = (subs || []).map((s: { email: string }) => s.email);

    if (recipients.length === 0) {
      return new Response(JSON.stringify({ error: "No subscribers to send to" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Caleb Wolf Photography <admin@calebwolfphotography.com>",
        to: recipients,
        subject,
        html: wrappedHtml,
      }),
    });

    if (!sendRes.ok) {
      const errBody = await sendRes.text();
      return new Response(JSON.stringify({ error: `Email send failed: ${errBody}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, sentTo: recipients.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
