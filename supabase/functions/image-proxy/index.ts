import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const WATERMARK = "© Caleb Wolf Photography";

async function processImage(
  imageBytes: Uint8Array,
  mimeType: string,
  maxWidth: number,
): Promise<{ bytes: Uint8Array; contentType: string }> {
  // @ts-ignore
  const bitmap = await createImageBitmap(new Blob([imageBytes], { type: mimeType }));
  const srcW = bitmap.width;
  const srcH = bitmap.height;

  // Scale down if wider than maxWidth, preserve aspect ratio
  const scale = srcW > maxWidth ? maxWidth / srcW : 1;
  const outW = Math.round(srcW * scale);
  const outH = Math.round(srcH * scale);

  // @ts-ignore
  const canvas = new OffscreenCanvas(outW, outH);
  const ctx = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D;

  ctx.drawImage(bitmap, 0, 0, outW, outH);

  // Watermark — tiled diagonally
  const fontSize = Math.max(14, Math.round(outW / 28));
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.15)";
  ctx.lineWidth = 1;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const spacing = fontSize * 8;
  for (let y = -outH; y < outH * 2; y += spacing) {
    for (let x = -outW; x < outW * 2; x += spacing) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-Math.PI / 6);
      ctx.strokeText(WATERMARK, 0, 0);
      ctx.fillText(WATERMARK, 0, 0);
      ctx.restore();
    }
  }

  // Prefer WebP — smaller file size, better quality at lower bitrate
  let blob = await canvas.convertToBlob({ type: "image/webp", quality: 0.82 });
  let contentType = "image/webp";

  // Fall back to JPEG if WebP isn't supported by the runtime
  if (!blob || blob.size === 0) {
    blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.82 });
    contentType = "image/jpeg";
  }

  return { bytes: new Uint8Array(await blob.arrayBuffer()), contentType };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.searchParams.get("path");
    const wantDownload = url.searchParams.get("download") === "1";
    // Optional max-width for thumbnails vs lightbox. Default 1400 (lightbox).
    const maxWidth = Math.min(3000, Math.max(100, parseInt(url.searchParams.get("w") ?? "1400", 10)));

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

      // 60-second signed URL pointing to the original full-res file
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

    // Preview mode: resize + watermark + return WebP/JPEG
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
    let contentType = "image/jpeg";

    try {
      const result = await processImage(originalBytes, mimeType, maxWidth);
      outputBytes = result.bytes;
      contentType = result.contentType;
    } catch {
      // Graceful fallback — return original untransformed
      outputBytes = originalBytes;
      contentType = mimeType;
    }

    return new Response(outputBytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
