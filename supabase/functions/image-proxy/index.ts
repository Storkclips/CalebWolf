import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Watermark text drawn on preview images
const WATERMARK = "© Caleb Wolf Photography";

/**
 * Draw a semi-transparent diagonal watermark tile over a JPEG/PNG image.
 * Uses the Deno-native Canvas API provided by the edge runtime.
 */
async function addWatermark(imageBytes: Uint8Array, mimeType: string): Promise<Uint8Array> {
  // @ts-ignore — createImageBitmap is available in Supabase edge runtime
  const bitmap = await createImageBitmap(new Blob([imageBytes], { type: mimeType }));
  const { width, height } = bitmap;

  // @ts-ignore — OffscreenCanvas available in edge runtime
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D;

  // Draw original image
  ctx.drawImage(bitmap, 0, 0);

  // Watermark style
  const fontSize = Math.max(18, Math.round(width / 30));
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.38)";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.18)";
  ctx.lineWidth = 1;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Tile the watermark diagonally
  ctx.save();
  const spacing = fontSize * 8;
  for (let y = -height; y < height * 2; y += spacing) {
    for (let x = -width; x < width * 2; x += spacing) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-Math.PI / 6);
      ctx.strokeText(WATERMARK, 0, 0);
      ctx.fillText(WATERMARK, 0, 0);
      ctx.restore();
    }
  }
  ctx.restore();

  // Export as JPEG (smaller, faster)
  const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.82 });
  return new Uint8Array(await blob.arrayBuffer());
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    // ?path=images/abc.jpg  — the storage object path inside the 'gallery' bucket
    const path = url.searchParams.get("path");
    // ?download=1  — return a signed URL for the original file (requires auth)
    const wantDownload = url.searchParams.get("download") === "1";

    if (!path) {
      return new Response(JSON.stringify({ error: "Missing path" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    if (wantDownload) {
      // Verify the caller is authenticated before giving them the signed URL
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: authError } = await userClient.auth.getUser();
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate a short-lived signed URL (60 seconds)
      const { data: signed, error: signErr } = await admin.storage
        .from("gallery")
        .createSignedUrl(path, 60);

      if (signErr || !signed?.signedUrl) {
        return new Response(JSON.stringify({ error: "Could not sign URL" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ url: signed.signedUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Preview mode: fetch original, apply watermark, return JPEG ---
    const { data: fileData, error: dlError } = await admin.storage
      .from("gallery")
      .download(path);

    if (dlError || !fileData) {
      return new Response(JSON.stringify({ error: "Image not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mimeType = fileData.type || "image/jpeg";
    const originalBytes = new Uint8Array(await fileData.arrayBuffer());

    let outputBytes: Uint8Array;
    try {
      outputBytes = await addWatermark(originalBytes, mimeType);
    } catch {
      // If canvas watermarking fails, return original (graceful fallback)
      outputBytes = originalBytes;
    }

    return new Response(outputBytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/jpeg",
        // Short cache — 10 minutes in CDN, revalidate after
        "Cache-Control": "public, max-age=600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
