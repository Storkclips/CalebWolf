import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const PRICE_CREDITS_MAP: Record<string, number> = {
  'price_1SxZ1nQsBFyT5mbBGOll9aOs': 10,
  'price_1SxZBeQsBFyT5mbBL8zVOpbC': 50,
  'price_1SxZBLQsBFyT5mbBYS6E6CW1': 100,
};

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response('No signature found', { status: 400 });
    }

    const body = await req.text();

    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (error: any) {
      console.error(`Webhook signature verification failed: ${error.message}`);
      return new Response(`Webhook signature verification failed: ${error.message}`, { status: 400 });
    }

    EdgeRuntime.waitUntil(handleEvent(event));

    return Response.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleEvent(event: Stripe.Event) {
  const stripeData = event?.data?.object ?? {};

  if (!stripeData) {
    return;
  }

  if (!('customer' in stripeData)) {
    return;
  }

  if (event.type === 'payment_intent.succeeded' && event.data.object.invoice === null) {
    return;
  }

  const { customer: customerId } = stripeData;

  if (!customerId || typeof customerId !== 'string') {
    console.error(`No customer received on event: ${JSON.stringify(event)}`);
  } else {
    let isSubscription = true;

    if (event.type === 'checkout.session.completed') {
      const { mode } = stripeData as Stripe.Checkout.Session;

      isSubscription = mode === 'subscription';

      console.info(`Processing ${isSubscription ? 'subscription' : 'one-time payment'} checkout session`);
    }

    const { mode, payment_status } = stripeData as Stripe.Checkout.Session;

    if (isSubscription) {
      console.info(`Starting subscription sync for customer: ${customerId}`);
      await syncCustomerFromStripe(customerId);

      if (event.type === 'checkout.session.completed' || event.type === 'invoice.paid') {
        const session = stripeData as Stripe.Checkout.Session;
        const lineItems = session.line_items?.data;
        let priceId: string | null = null;

        if (lineItems && lineItems.length > 0) {
          priceId = lineItems[0].price?.id ?? null;
        }

        if (!priceId) {
          const subs = await stripe.subscriptions.list({
            customer: customerId,
            limit: 1,
            status: 'active',
          });
          if (subs.data.length > 0) {
            priceId = subs.data[0].items.data[0].price.id;
          }
        }

        if (priceId) {
          await grantCredits(customerId, priceId, event.id);
        }
      }
    } else if (mode === 'payment' && payment_status === 'paid') {
      try {
        const {
          id: checkout_session_id,
          payment_intent,
          amount_subtotal,
          amount_total,
          currency,
        } = stripeData as Stripe.Checkout.Session;

        const { error: orderError } = await supabase.from('stripe_orders').insert({
          checkout_session_id,
          payment_intent_id: payment_intent,
          customer_id: customerId,
          amount_subtotal,
          amount_total,
          currency,
          payment_status,
          status: 'completed',
        });

        if (orderError) {
          console.error('Error inserting order:', orderError);
          return;
        }

        // Fetch the full session with line_items expanded
        console.info(`Retrieving session ${checkout_session_id} to extract price ID`);
        const fullSession = await stripe.checkout.sessions.retrieve(checkout_session_id, {
          expand: ['line_items'],
        });

        console.info(`Session retrieved, line_items count: ${fullSession.line_items?.data?.length ?? 0}`);
        const lineItems = fullSession.line_items?.data;
        let priceId: string | null = null;

        if (lineItems && lineItems.length > 0) {
          priceId = lineItems[0].price?.id ?? null;
          console.info(`Extracted price ID: ${priceId}`);
        }

        if (priceId) {
          console.info(`Granting credits for price ID: ${priceId}`);
          await grantCredits(customerId, priceId, checkout_session_id);
        } else {
          console.error(`No price ID found for session: ${checkout_session_id}`);
        }

        console.info(`Successfully processed one-time payment for session: ${checkout_session_id}`);
      } catch (error) {
        console.error('Error processing one-time payment:', error);
      }
    }
  }
}

async function grantCredits(customerId: string, priceId: string, eventRef: string) {
  const credits = PRICE_CREDITS_MAP[priceId];

  if (!credits) {
    console.info(`No credit mapping for price ${priceId}, skipping credit grant`);
    return;
  }

  const { data: customer } = await supabase
    .from('stripe_customers')
    .select('user_id')
    .eq('customer_id', customerId)
    .maybeSingle();

  if (!customer?.user_id) {
    console.error(`No user found for stripe customer ${customerId}`);
    return;
  }

  const userId = customer.user_id;

  const { data: existing } = await supabase
    .from('credit_transactions')
    .select('id')
    .eq('user_id', userId)
    .eq('type', 'stripe_purchase')
    .eq('description', `stripe:${eventRef}`)
    .maybeSingle();

  if (existing) {
    console.info(`Credits already granted for event ${eventRef}, skipping`);
    return;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('credit_balance')
    .eq('id', userId)
    .maybeSingle();

  if (!profile) {
    console.error(`No profile found for user ${userId}`);
    return;
  }

  const newBalance = (profile.credit_balance ?? 0) + credits;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ credit_balance: newBalance })
    .eq('id', userId);

  if (updateError) {
    console.error(`Failed to update credit balance for user ${userId}:`, updateError);
    return;
  }

  const { error: txError } = await supabase.from('credit_transactions').insert({
    user_id: userId,
    amount: credits,
    type: 'stripe_purchase',
    description: `stripe:${eventRef}`,
  });

  if (txError) {
    console.error(`Failed to record credit transaction for user ${userId}:`, txError);
    return;
  }

  console.info(`Granted ${credits} credits to user ${userId} (balance: ${newBalance})`);
}

async function syncCustomerFromStripe(customerId: string) {
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'all',
      expand: ['data.default_payment_method'],
    });

    if (subscriptions.data.length === 0) {
      console.info(`No active subscriptions found for customer: ${customerId}`);
      const { error: noSubError } = await supabase.from('stripe_subscriptions').upsert(
        {
          customer_id: customerId,
          subscription_status: 'not_started',
        },
        {
          onConflict: 'customer_id',
        },
      );

      if (noSubError) {
        console.error('Error updating subscription status:', noSubError);
        throw new Error('Failed to update subscription status in database');
      }
    }

    const subscription = subscriptions.data[0];

    const { error: subError } = await supabase.from('stripe_subscriptions').upsert(
      {
        customer_id: customerId,
        subscription_id: subscription.id,
        price_id: subscription.items.data[0].price.id,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        ...(subscription.default_payment_method && typeof subscription.default_payment_method !== 'string'
          ? {
              payment_method_brand: subscription.default_payment_method.card?.brand ?? null,
              payment_method_last4: subscription.default_payment_method.card?.last4 ?? null,
            }
          : {}),
        status: subscription.status,
      },
      {
        onConflict: 'customer_id',
      },
    );

    if (subError) {
      console.error('Error syncing subscription:', subError);
      throw new Error('Failed to sync subscription in database');
    }
    console.info(`Successfully synced subscription for customer: ${customerId}`);
  } catch (error) {
    console.error(`Failed to sync subscription for customer ${customerId}:`, error);
    throw error;
  }
}
