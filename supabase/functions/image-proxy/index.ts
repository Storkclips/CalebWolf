import { createClient } from "npm:@supabase/supabase-js@2";
import {
  ImageMagick,
  initializeImageMagick,
  MagickFormat,
  MagickColor,
  MagickGeometry,
  Gravity,
} from "npm:@imagemagick/magick-wasm@0.0.30";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const WATERMARK = "\u00a9 Caleb Wolf Photography";

// Initialize ImageMagick WASM once at cold-start
const wasmBytes = await Deno.readFile(
  new URL("magick.wasm", import.meta.resolve("npm:@imagemagick/magick-wasm@0.0.30"))
);
await initializeImageMagick(wasmBytes);

function processImage(imageBytes: Uint8Array, maxWidth: number): Uint8Array {
  return ImageMagick.read(imageBytes, (img) => {
    // Resize if wider than maxWidth, preserve aspect ratio
    if (img.width > maxWidth) {
      const h = Math.round((img.height / img.width) * maxWidth);
      img.resize(maxWidth, h);
    }

    const w = img.width;
    const h = img.height;
    const fontSize = Math.max(14, Math.round(w / 30));
    const spacingX = Math.round(fontSize * 12);
    const spacingY = Math.round(fontSize * 6);

    // Semi-transparent white fill with dark stroke for contrast on any background
    img.settings.fillColor = new MagickColor(255, 255, 255, 100);
    img.settings.strokeColor = new MagickColor(0, 0, 0, 60);
    img.settings.strokeWidth = 0.8;
    img.settings.fontPointsize = fontSize;

    // Tile watermark diagonally across the image
    for (let y = -h; y < h * 2; y += spacingY) {
      for (let x = -w; x < w * 2; x += spacingX) {
        img.annotate(
          WATERMARK,
          new MagickGeometry(x, y, 0, 0),
          Gravity.NorthWest,
          -30,
        );
      }
    }

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

    // Preview: fetch original, resize + watermark, return JPEG
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
