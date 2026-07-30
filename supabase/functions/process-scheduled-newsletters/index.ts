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

    // Find due pending scheduled emails
    const now = new Date().toISOString();
    const { data: dueEmails, error: fetchErr } = await supabaseAdmin
      .from("newsletter_scheduled")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", now)
      .order("scheduled_for", { ascending: true })
      .limit(10);

    if (fetchErr) {
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!dueEmails || dueEmails.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      // Mark all as failed
      for (const email of dueEmails) {
        await supabaseAdmin
          .from("newsletter_scheduled")
          .update({ status: "failed", error_message: "RESEND_API_KEY not configured" })
          .eq("id", email.id);
      }
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured", processed: dueEmails.length, failed: dueEmails.length }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all active subscribers once
    const { data: subs } = await supabaseAdmin
      .from("newsletter_subscribers")
      .select("email")
      .eq("unsubscribed", false);

    const recipients = (subs || []).map((s: { email: string }) => s.email);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    // Convert CSS grid layouts to email-safe HTML tables, since email
    // clients don't support display:grid and would stack images vertically.
    const convertGridsToTables = (html: string) => {
      return html.replace(
        /<div class="rte-grid"([^>]*)>([\s\S]*?)<\/div>\s*<p>/gi,
        (_m: string, attrs: string, inner: string) => {
          const colsMatch = attrs.match(/data-cols="(\d+)"/i);
          const gapMatch = attrs.match(/data-gap="(\d+)"/i);
          const halignMatch = attrs.match(/data-halign="([^"]+)"/i);
          const valignMatch = attrs.match(/data-valign="([^"]+)"/i);
          const cols = parseInt(colsMatch?.[1] || "1", 10);
          const gap = parseInt(gapMatch?.[1] || "0", 10);
          const halign = halignMatch?.[1] || "center";
          const valign = valignMatch?.[1] || "middle";
          const vCss = valign === "top" ? "top" : valign === "bottom" ? "bottom" : "middle";

          const cellRegex = /<div class="rte-grid-cell[^"]*"(?:[^>]*?style="([^"]*)")?[^>]*>([\s\S]*?)<\/div>/gi;
          const cells: { style: string; content: string }[] = [];
          let cm: RegExpExecArray | null;
          while ((cm = cellRegex.exec(inner)) !== null) {
            cells.push({ style: cm[1] || "", content: cm[2] || "" });
          }
          if (cells.length === 0) return "";

          const rows: string[] = [];
          for (let i = 0; i < cells.length; i += cols) {
            const tds: string[] = [];
            for (let j = 0; j < cols && i + j < cells.length; j += 1) {
              const cell = cells[i + j];
              const w = Math.floor(100 / cols);
              const content = cell.content
                .replace(/height:100%/gi, "height:auto")
                .replace(/object-fit:[^;]+;?/gi, "")
                .replace(/justify-content:[^;]+;?/gi, "")
                .replace(/align-items:[^;]+;?/gi, "");
              tds.push(`<td style="width:${w}%;vertical-align:${vCss};text-align:${halign};${cell.style}">${content}</td>`);
            }
            rows.push(`<tr>${tds.join("")}</tr>`);
          }
          return `<table cellpadding="0" cellspacing="${gap}" border="0" style="width:100%;margin:0 0 16px;"><tbody>${rows.join("")}</tbody></table><p>`;
        },
      );
    };

    // Rewrite Supabase storage image URLs to go through the image-proxy
    // edge function, which serves images with Content-Disposition: inline
    // so email clients don't show a download button.
    const rewriteImages = (html: string) => {
      return html.replace(
        /(<img\s+[^>]*src=")(https:\/\/[^"\/]+\.supabase\.co\/storage\/v1\/object\/public\/gallery\/)([^"]+)(")/gi,
        (_m, prefix, _storageUrl, path, quote) => {
          return `${prefix}${supabaseUrl}/functions/v1/image-proxy?path=${encodeURIComponent(path)}${quote}`;
        },
      );
    };

    let sentCount = 0;
    let failedCount = 0;

    for (const email of dueEmails) {
      const processedHtml = rewriteImages(convertGridsToTables(email.html_body || ""));
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

      try {
        const sendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Caleb Wolf Photography <admin@calebwolfphotography.com>",
            to: recipients,
            subject: email.subject,
            html: wrappedHtml,
          }),
        });

        if (sendRes.ok) {
          await supabaseAdmin
            .from("newsletter_scheduled")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
              recipient_count: recipients.length,
            })
            .eq("id", email.id);
          sentCount++;
        } else {
          const errBody = await sendRes.text();
          await supabaseAdmin
            .from("newsletter_scheduled")
            .update({ status: "failed", error_message: errBody })
            .eq("id", email.id);
          failedCount++;
        }
      } catch (err) {
        await supabaseAdmin
          .from("newsletter_scheduled")
          .update({ status: "failed", error_message: err instanceof Error ? err.message : "Unknown error" })
          .eq("id", email.id);
        failedCount++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processed: dueEmails.length,
      sent: sentCount,
      failed: failedCount,
    }), {
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
