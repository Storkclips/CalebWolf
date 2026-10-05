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

    const { success_url, cancel_url } = await req.json();
    if (!success_url || !cancel_url) return cors({ error: 'Missing success_url or cancel_url' }, 400);

    // Load subscription settings — price must be resolved server-side
    const { data: settings } = await supabase
      .from('magazine_settings')
      .select('subscription_enabled, subscription_price_id, promotion_codes_enabled')
      .maybeSingle();

    if (!settings?.subscription_enabled) return cors({ error: 'Subscriptions are not enabled' }, 403);
    if (!settings?.subscription_price_id) return cors({ error: 'No subscription price configured' }, 500);

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
      line_items: [{ price: settings.subscription_price_id, quantity: 1 }],
      mode: 'subscription',
      allow_promotion_codes: settings.promotion_codes_enabled ?? false,
      success_url,
      cancel_url,
      metadata: {
        user_id: user.id,
        purchase_type: 'magazine_subscription',
      },
    });

    return cors({ sessionId: session.id, url: session.url });
  } catch (err: any) {
    console.error('magazine-subscription-checkout error:', err);
    return cors({ error: err.message }, 500);
  }
});
