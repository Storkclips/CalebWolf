import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const MAX_IMAGE_CHARS = 8_000_000;
const IMAGE_PATTERN = /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed.' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Sign in to publish pages.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: userData, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: profile } = await adminClient
      .from('profiles')
      .select('is_admin')
      .eq('id', userData.user.id)
      .maybeSingle();
    if (!profile?.is_admin) {
      return new Response(
        JSON.stringify({ error: 'Only admins can publish magazine pages.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const body = await req.json();
    const magazineId = typeof body?.magazine_id === 'string' ? body.magazine_id : '';
    const pruneFrom = Number.isInteger(body?.prune_from_index) ? body.prune_from_index : null;

    if (!magazineId) {
      return new Response(
        JSON.stringify({ error: 'magazine_id is required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: magazine } = await adminClient
      .from('magazines')
      .select('id')
      .eq('id', magazineId)
      .maybeSingle();
    if (!magazine) {
      return new Response(
        JSON.stringify({ error: 'Magazine not found.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (pruneFrom !== null) {
      const { error } = await adminClient
        .from('magazine_reader_pages')
        .delete()
        .eq('magazine_id', magazineId)
        .gte('page_index', pruneFrom);
      if (error) {
        return new Response(
          JSON.stringify({ error: `Could not clean up old pages: ${error.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      return new Response(
        JSON.stringify({ pruned: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const pageIndex = Number(body?.page_index);
    const label = typeof body?.label === 'string' ? body.label : '';
    const image = typeof body?.image === 'string' ? body.image : '';

    if (!Number.isInteger(pageIndex) || pageIndex < 0 || pageIndex > 999) {
      return new Response(
        JSON.stringify({ error: 'page_index must be a whole number between 0 and 999.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    if (!IMAGE_PATTERN.test(image)) {
      return new Response(
        JSON.stringify({ error: 'image must be a base64 webp, jpeg, or png data URL.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    if (image.length > MAX_IMAGE_CHARS) {
      return new Response(
        JSON.stringify({ error: 'Page image is too large.' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { error: upsertError } = await adminClient
      .from('magazine_reader_pages')
      .upsert(
        { magazine_id: magazineId, page_index: pageIndex, label, image },
        { onConflict: 'magazine_id,page_index' },
      );
    if (upsertError) {
      return new Response(
        JSON.stringify({ error: `Could not store page ${pageIndex}: ${upsertError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ stored: pageIndex }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err?.message || 'Unexpected error.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
