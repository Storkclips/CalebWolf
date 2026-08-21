import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const STORAGE_PUBLIC_PREFIX = "/storage/v1/object/public/gallery/";

function isExternalUrl(url: string): boolean {
  return url.startsWith("http") && !url.includes("supabase.co");
}

function extFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const pathname = u.pathname.toLowerCase();
    const match = pathname.match(/\.(jpe?g|png|webp|gif|avif|bmp|tiff?)(\?|$)/);
    if (match) return match[1].replace("jpeg", "jpg").replace("tiff", "tif");
    return "jpg";
  } catch {
    return "jpg";
  }
}

async function downloadAndStore(
  admin: ReturnType<typeof createClient>,
  externalUrl: string,
  folder: string,
): Promise<string | null> {
  try {
    const resp = await fetch(externalUrl, {
      headers: { "User-Agent": "CalebWolfPhotography/1.0" },
    });
    if (!resp.ok) return null;

    const blob = await resp.blob();
    const contentType = blob.type || "image/jpeg";
    const ext = contentType.split("/")[1]?.replace("jpeg", "jpg") || extFromUrl(externalUrl);
    const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

    const { error: uploadError } = await admin.storage
      .from("gallery")
      .upload(filename, blob, { contentType, upsert: false });

    if (uploadError) {
      console.error("Upload failed:", uploadError.message);
      return null;
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    return `${supabaseUrl}${STORAGE_PUBLIC_PREFIX}${filename}`;
  } catch (err) {
    console.error("Download/store failed:", err);
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { scope } = body; // "blog" | "gallery" | "all"

    const results = { migrated: 0, failed: 0, skipped: 0, details: [] as string[] };

    // ── Migrate blog_images ──
    if (scope === "blog" || scope === "all") {
      const { data: blogImages, error } = await admin
        .from("blog_images")
        .select("id, url");

      if (!error && blogImages) {
        for (const img of blogImages) {
          if (!isExternalUrl(img.url)) {
            results.skipped++;
            continue;
          }
          const newUrl = await downloadAndStore(admin, img.url, "blog");
          if (newUrl) {
            await admin.from("blog_images").update({ url: newUrl }).eq("id", img.id);
            // Also update collection_images that reference this blog image
            await admin
              .from("collection_images")
              .update({ url: newUrl })
              .eq("blog_image_id", img.id);
            results.migrated++;
            results.details.push(`blog_images ${img.id}: ${img.url} → stored`);
          } else {
            results.failed++;
            results.details.push(`blog_images ${img.id}: FAILED`);
          }
        }
      }
    }

    // ── Migrate gallery_images ──
    if (scope === "gallery" || scope === "all") {
      const { data: galleryImages, error } = await admin
        .from("gallery_images")
        .select("id, url");

      if (!error && galleryImages) {
        for (const img of galleryImages) {
          if (!isExternalUrl(img.url)) {
            results.skipped++;
            continue;
          }
          const newUrl = await downloadAndStore(admin, img.url, "images");
          if (newUrl) {
            await admin.from("gallery_images").update({ url: newUrl }).eq("id", img.id);
            results.migrated++;
            results.details.push(`gallery_images ${img.id}: migrated`);
          } else {
            results.failed++;
            results.details.push(`gallery_images ${img.id}: FAILED`);
          }
        }
      }
    }

    // ── Migrate collection_images ──
    if (scope === "gallery" || scope === "all") {
      const { data: collImages, error } = await admin
        .from("collection_images")
        .select("id, url, blog_image_id");

      if (!error && collImages) {
        for (const img of collImages) {
          if (img.blog_image_id) continue; // already handled via blog_images
          if (!isExternalUrl(img.url)) {
            results.skipped++;
            continue;
          }
          const newUrl = await downloadAndStore(admin, img.url, "collections");
          if (newUrl) {
            await admin.from("collection_images").update({ url: newUrl }).eq("id", img.id);
            results.migrated++;
            results.details.push(`collection_images ${img.id}: migrated`);
          } else {
            results.failed++;
            results.details.push(`collection_images ${img.id}: FAILED`);
          }
        }
      }
    }

    // ── Migrate admin_collections cover_url ──
    if (scope === "gallery" || scope === "all") {
      const { data: collections, error } = await admin
        .from("admin_collections")
        .select("id, cover_url");

      if (!error && collections) {
        for (const coll of collections) {
          if (!coll.cover_url || !isExternalUrl(coll.cover_url)) {
            continue;
          }
          const newUrl = await downloadAndStore(admin, coll.cover_url, "collections");
          if (newUrl) {
            await admin.from("admin_collections").update({ cover_url: newUrl }).eq("id", coll.id);
            results.migrated++;
            results.details.push(`admin_collections ${coll.id}: cover migrated`);
          } else {
            results.failed++;
            results.details.push(`admin_collections ${coll.id}: cover FAILED`);
          }
        }
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err), migrated: 0, failed: 0, skipped: 0, details: [] }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
