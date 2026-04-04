import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  appInfo: { name: 'Caleb Photography Print Orders', version: '1.0.0' },
});

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const {
      image_id,
      image_title,
      image_url,
      print_size_id,
      print_size_label,
      quantity,
      unit_price,
      total_price,
      customer_name,
      customer_email,
      shipping_address,
      notes,
      success_url,
      cancel_url,
    } = body;

    if (!print_size_id || !quantity || !total_price || !success_url || !cancel_url) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Look up or create Stripe customer
    const { data: existingCustomer } = await supabase
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    let customerId: string;

    if (existingCustomer?.customer_id) {
      customerId = existingCustomer.customer_id;
    } else {
      const newCustomer = await stripe.customers.create({
        email: user.email,
        name: customer_name || undefined,
        metadata: { userId: user.id },
      });
      await supabase.from('stripe_customers').insert({
        user_id: user.id,
        customer_id: newCustomer.id,
      });
      customerId = newCustomer.id;
    }

    // Insert the print order as pending (no session ID yet)
    const { data: order, error: orderError } = await supabase
      .from('print_orders')
      .insert({
        user_id: user.id,
        image_id: image_id || '',
        image_title: image_title || '',
        image_url: image_url || '',
        print_size_id,
        print_size_label,
        quantity,
        unit_price,
        total_price,
        customer_name,
        customer_email,
        shipping_address,
        notes: notes || '',
        status: 'pending',
      })
      .select('id')
      .single();

    if (orderError || !order) {
      console.error('Failed to create print order:', orderError);
      return new Response(JSON.stringify({ error: 'Failed to create order' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Stripe Checkout Session with a dynamic price
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(total_price * 100),
            product_data: {
              name: `Print: ${print_size_label}`,
              description: image_title ? `Photo: ${image_title} · Qty: ${quantity}` : `Qty: ${quantity}`,
            },
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${success_url}?order_id=${order.id}`,
      cancel_url,
      metadata: {
        order_type: 'print_order',
        print_order_id: order.id,
        user_id: user.id,
      },
    });

    // Attach the Stripe session ID to the order
    await supabase
      .from('print_orders')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', order.id);

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id, orderId: order.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('stripe-print-checkout error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
