import { createClient } from "npm:@supabase/supabase-js@2";
import {
  ImageMagick,
  initializeImageMagick,
  MagickFormat,
  MagickColor,
  Gravity,
} from "npm:@imagemagick/magick-wasm@0.0.30";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const WATERMARK = "© Caleb Wolf Photography";

// Initialize ImageMagick WASM once at cold-start
const wasmBytes = await Deno.readFile(
  new URL("magick.wasm", import.meta.resolve("npm:@imagemagick/magick-wasm@0.0.30"))
);
await initializeImageMagick(wasmBytes);

function processImage(imageBytes: Uint8Array, maxWidth: number): Uint8Array {
  return ImageMagick.read(imageBytes, (img) => {
    // Resize if wider than maxWidth, preserve aspect ratio
    if (img.width > maxWidth) {
      img.resize(maxWidth, Math.round((img.height / img.width) * maxWidth));
    }

    // --- Watermark: tiled diagonal text across the full image ---
    const fontSize = Math.max(16, Math.round(img.width / 28));
    const spacing = fontSize * 9;

    // Draw the watermark grid
    for (let y = -img.height; y < img.height * 2; y += spacing) {
      for (let x = -img.width; x < img.width * 2; x += spacing) {
        img.annotate(WATERMARK, {
          x,
          y,
          gravity: Gravity.NorthWest,
          angle: -30,
          font: "DejaVu-Sans-Bold",
          fontSize,
          fillColor: new MagickColor(255, 255, 255, 80), // semi-transparent white
          strokeColor: new MagickColor(0, 0, 0, 40),    // subtle dark outline
          strokeWidth: 1,
        });
      }
    }

    // Output as JPEG for size efficiency
    return img.write(MagickFormat.Jpeg, (data) => data);
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.searchParams.get("path");
    const wantDownload = url.searchParams.get("download") === "1";
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

    // --- Preview: fetch original, resize + watermark, return JPEG ---
    const { data: fileData, error: dlError } = await admin.storage
      .from("gallery")
      .download(path);

    if (dlError || !fileData) {
      return new Response(JSON.stringify({ error: "Image not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const originalBytes = new Uint8Array(await fileData.arrayBuffer());
    const outputBytes = processImage(originalBytes, maxWidth);

    return new Response(outputBytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/jpeg",
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
