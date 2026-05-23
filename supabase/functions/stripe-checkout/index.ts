import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: { name: 'Bolt Integration', version: '1.0.0' },
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function corsResponse(body: string | object | null, status = 200) {
  if (status === 204) {
    return new Response(null, { status, headers: corsHeaders });
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') return corsResponse({}, 204);
    if (req.method !== 'POST') return corsResponse({ error: 'Method not allowed' }, 405);

    const { package_id, success_url, cancel_url } = await req.json();

    if (!package_id || !success_url || !cancel_url) {
      return corsResponse({ error: 'Missing required parameters: package_id, success_url, cancel_url' }, 400);
    }

    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return corsResponse({ error: 'Missing authorization header' }, 401);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: getUserError } = await supabase.auth.getUser(token);
    if (getUserError || !user) return corsResponse({ error: 'Failed to authenticate user' }, 401);

    // Load package
    const { data: pkg, error: pkgError } = await supabase
      .from('credit_packages')
      .select('*')
      .eq('id', package_id)
      .eq('active', true)
      .maybeSingle();

    if (pkgError || !pkg) return corsResponse({ error: 'Credit package not found' }, 404);

    const isOnSale = pkg.sale_active && pkg.sale_price_cents > 0;
    const priceCents = isOnSale ? pkg.sale_price_cents : pkg.price_cents;
    const totalCredits = (pkg.credits ?? 0) + (pkg.bonus_credits ?? 0);

    // Build line item description
    let description = `${totalCredits} download credits`;
    if (pkg.bonus_credits > 0) {
      description = `${pkg.credits} credits + ${pkg.bonus_credits} bonus = ${totalCredits} total download credits`;
    }
    if (isOnSale && pkg.sale_label) {
      description = `${pkg.sale_label} — ${description}`;
    }

    // Get or create Stripe customer
    const { data: customer } = await supabase
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    let customerId: string;

    if (!customer?.customer_id) {
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });

      const { error: createCustomerError } = await supabase.from('stripe_customers').insert({
        user_id: user.id,
        customer_id: newCustomer.id,
      });

      if (createCustomerError) {
        try { await stripe.customers.del(newCustomer.id); } catch (_) {}
        return corsResponse({ error: 'Failed to create customer mapping' }, 500);
      }

      customerId = newCustomer.id;
    } else {
      customerId = customer.customer_id;
    }

    // Build the checkout session line items
    // If on sale or has bonus credits: use a custom price_data so the receipt reflects
    // the actual charged amount and a clear description of what's included.
    // Otherwise use the stored Stripe price ID directly.
    let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];

    if (isOnSale || pkg.bonus_credits > 0 || !pkg.stripe_price_id) {
      lineItems = [{
        price_data: {
          currency: 'usd',
          unit_amount: priceCents,
          product_data: {
            name: pkg.name,
            description,
            ...(pkg.stripe_product_id ? { } : {}),
          },
        },
        quantity: 1,
      }];
    } else {
      lineItems = [{ price: pkg.stripe_price_id, quantity: 1 }];
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url,
      cancel_url,
      metadata: {
        package_id: pkg.id,
        credits: String(pkg.credits),
        bonus_credits: String(pkg.bonus_credits ?? 0),
        total_credits: String(totalCredits),
      },
    });

    return corsResponse({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error(`Checkout error: ${error.message}`);
    return corsResponse({ error: error.message }, 500);
  }
});
