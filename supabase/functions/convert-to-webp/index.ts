import { createClient } from "npm:@supabase/supabase-js@2";
import sharp from "npm:sharp@0.33.5";

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { storagePath, imageId } = await req.json();
    if (!storagePath || !imageId) {
      return new Response(JSON.stringify({ error: "Missing storagePath or imageId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Verify user is authenticated and is admin
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

    // Download original from storage
    const { data: fileData, error: dlError } = await admin.storage
      .from("gallery")
      .download(storagePath);

    if (dlError || !fileData) {
      return new Response(JSON.stringify({ error: "Image not found in storage" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert to WebP
    const originalBuffer = await fileData.arrayBuffer();
    const webpBuffer = await sharp(new Uint8Array(originalBuffer))
      .webp({ quality: 82 })
      .toBuffer();

    // Build webp storage path — same base name, .webp extension
    const baseName = storagePath.replace(/\.[^.]+$/, "");
    const webpPath = `${baseName}.webp`;

    // Upload WebP to the same gallery bucket under webp/ prefix
    const webpStoragePath = webpPath.replace(/^images\//, "webp/");

    const { error: upError } = await admin.storage
      .from("gallery")
      .upload(webpStoragePath, webpBuffer, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: true,
      });

    if (upError) {
      return new Response(JSON.stringify({ error: `WebP upload failed: ${upError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: urlData } = admin.storage.from("gallery").getPublicUrl(webpStoragePath);
    const webpUrl = urlData.publicUrl;

    // Update gallery_images row with the webp_url
    const { error: updateError } = await admin
      .from("gallery_images")
      .update({ webp_url: webpUrl })
      .eq("id", imageId);

    if (updateError) {
      return new Response(JSON.stringify({ error: `DB update failed: ${updateError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ webpUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
