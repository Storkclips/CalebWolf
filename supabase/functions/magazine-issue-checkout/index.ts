import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  appInfo: { name: 'Bolt Integration', version: '1.0.0' },
});
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function cors(body: object | null, status = 200) {
  if (status === 204) return new Response(null, { status, headers: corsHeaders });
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return cors(null, 204);
  if (req.method !== 'POST') return cors({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return cors({ error: 'Unauthorized' }, 401);
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );
    if (authError || !user) return cors({ error: 'Unauthorized' }, 401);

    const { magazine_id, success_url, cancel_url } = await req.json();
    if (!magazine_id || !success_url || !cancel_url) {
      return cors({ error: 'Missing magazine_id, success_url, or cancel_url' }, 400);
    }

    // Load the magazine
    const { data: magazine } = await supabase
      .from('magazines')
      .select('id, title, slug, status')
      .eq('id', magazine_id)
      .eq('status', 'published')
      .maybeSingle();

    if (!magazine) return cors({ error: 'Magazine not found' }, 404);

    // Price must come from the server — individual issue price equals the subscription price
    const { data: settings } = await supabase
      .from('magazine_settings')
      .select('subscription_price_id, subscription_price_display, subscription_currency')
      .maybeSingle();

    if (!settings?.subscription_price_id) return cors({ error: 'No price configured' }, 500);

    // Retrieve the Stripe price to get the actual amount
    const stripePrice = await stripe.prices.retrieve(settings.subscription_price_id);
    const unitAmount = stripePrice.unit_amount ?? 0;
    const currency = settings.subscription_currency ?? 'usd';

    // Get or create Stripe customer
    const { data: existing } = await supabase
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    let customerId: string;
    if (existing?.customer_id) {
      customerId = existing.customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      await supabase.from('stripe_customers').insert({ user_id: user.id, customer_id: customer.id });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency,
          unit_amount: unitAmount,
          product_data: { name: magazine.title, description: 'Digital magazine — permanent access' },
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url,
      cancel_url,
      metadata: {
        user_id: user.id,
        magazine_id: magazine.id,
        magazine_slug: magazine.slug,
        purchase_type: 'magazine_issue',
      },
    });

    return cors({ sessionId: session.id, url: session.url });
  } catch (err: any) {
    console.error('magazine-issue-checkout error:', err);
    return cors({ error: err.message }, 500);
  }
});
