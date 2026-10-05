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

async function getCreditsForPrice(priceId: string): Promise<number> {
  const { data } = await supabase
    .from('credit_packages')
    .select('credits, bonus_credits')
    .eq('stripe_price_id', priceId)
    .maybeSingle();

  if (!data) return 0;
  return (data.credits ?? 0) + (data.bonus_credits ?? 0);
}

async function getCreditsFromSession(session: Stripe.Checkout.Session): Promise<number> {
  // Prefer metadata set at checkout time (handles sale prices + bonus correctly)
  const metaTotal = session.metadata?.total_credits;
  if (metaTotal) {
    const n = parseInt(metaTotal, 10);
    if (!isNaN(n) && n > 0) return n;
  }

  // Fallback: look up by price ID
  const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ['line_items'],
  });
  const priceId = fullSession.line_items?.data?.[0]?.price?.id ?? null;
  if (priceId) return getCreditsForPrice(priceId);

  return 0;
}

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
      await syncMagazineSubscription(customerId);

      // Grant permanent magazine entitlements to new/renewing subscribers
      if (event.type === 'checkout.session.completed' || event.type === 'invoice.paid') {
        await grantMagazineReleasesToSubscriber(customerId);
      }

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
          metadata,
        } = stripeData as Stripe.Checkout.Session;

        // Handle magazine issue purchases
        if (metadata?.purchase_type === 'magazine_issue' && metadata?.magazine_id && metadata?.user_id) {
          const paymentIntentId = typeof payment_intent === 'string'
            ? payment_intent
            : (payment_intent as any)?.id ?? null;

          const { error: entitlementError } = await supabase
            .from('magazine_entitlements')
            .upsert(
              {
                user_id: metadata.user_id,
                magazine_id: metadata.magazine_id,
                source: 'one_time_purchase',
                stripe_checkout_session_id: checkout_session_id,
                stripe_payment_intent_id: paymentIntentId,
                granted_at: new Date().toISOString(),
              },
              { onConflict: 'user_id,magazine_id', ignoreDuplicates: true },
            );

          if (entitlementError) {
            console.error('Failed to grant magazine entitlement:', entitlementError);
          } else {
            console.info(`Magazine entitlement granted: user ${metadata.user_id} → magazine ${metadata.magazine_id}`);
          }
          return;
        }

        // Handle print orders — confirm them and skip the credits flow
        if (metadata?.order_type === 'print_order' && metadata?.print_order_id) {
          const { error: confirmError } = await supabase
            .from('print_orders')
            .update({ status: 'confirmed', updated_at: new Date().toISOString() })
            .eq('id', metadata.print_order_id);

          if (confirmError) {
            console.error('Error confirming print order:', confirmError);
          } else {
            console.info(`Print order ${metadata.print_order_id} confirmed via Stripe session ${checkout_session_id}`);
          }
          return;
        }

        const paymentIntentId = typeof payment_intent === 'string'
          ? payment_intent
          : (payment_intent as any)?.id ?? null;

        const { error: orderError } = await supabase.from('stripe_orders').insert({
          checkout_session_id,
          payment_intent_id: paymentIntentId,
          customer_id: customerId,
          amount_subtotal,
          amount_total,
          currency,
          payment_status,
          status: 'completed',
        });

        if (orderError) {
          console.error('Error inserting order (non-fatal, continuing to grant credits):', orderError);
        }

        const credits = await getCreditsFromSession(stripeData as Stripe.Checkout.Session);
        console.info(`Credits to grant for session ${checkout_session_id}: ${credits}`);

        if (credits > 0) {
          await grantCreditsAmount(customerId, credits, checkout_session_id);
        } else {
          console.error(`No credits resolved for session: ${checkout_session_id}`);
        }

        console.info(`Successfully processed one-time payment for session: ${checkout_session_id}`);
      } catch (error) {
        console.error('Error processing one-time payment:', error);
      }
    }
  }
}

async function grantCredits(customerId: string, priceId: string, eventRef: string) {
  const credits = await getCreditsForPrice(priceId);

  if (!credits) {
    console.info(`No credit mapping for price ${priceId}, skipping credit grant`);
    return;
  }

  await grantCreditsAmount(customerId, credits, eventRef);
}

async function grantCreditsAmount(customerId: string, credits: number, eventRef: string) {
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

async function syncMagazineSubscription(customerId: string) {
  try {
    const { data: customerRow } = await supabase
      .from('stripe_customers')
      .select('user_id')
      .eq('customer_id', customerId)
      .maybeSingle();

    if (!customerRow?.user_id) return;

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'all',
    });

    if (subscriptions.data.length === 0) {
      await supabase
        .from('magazine_subscriptions')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('user_id', customerRow.user_id);
      return;
    }

    const sub = subscriptions.data[0];
    const priceId = sub.items.data[0].price.id;

    // Only mirror subscriptions created via the magazine checkout
    const { data: settings } = await supabase
      .from('magazine_settings')
      .select('subscription_price_id')
      .maybeSingle();

    if (settings?.subscription_price_id && priceId !== settings.subscription_price_id) {
      return; // Not a magazine subscription
    }

    const { error } = await supabase
      .from('magazine_subscriptions')
      .upsert(
        {
          user_id: customerRow.user_id,
          stripe_subscription_id: sub.id,
          stripe_customer_id: customerId,
          stripe_price_id: priceId,
          status: sub.status,
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
          canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );

    if (error) console.error('Failed to sync magazine_subscription:', error);
    else console.info(`Magazine subscription synced for user ${customerRow.user_id}`);
  } catch (err) {
    console.error('syncMagazineSubscription error:', err);
  }
}

async function grantMagazineReleasesToSubscriber(customerId: string) {
  try {
    const { data: customerRow } = await supabase
      .from('stripe_customers')
      .select('user_id')
      .eq('customer_id', customerId)
      .maybeSingle();

    if (!customerRow?.user_id) return;

    const { data: sub } = await supabase
      .from('magazine_subscriptions')
      .select('stripe_subscription_id, status')
      .eq('user_id', customerRow.user_id)
      .in('status', ['active', 'trialing'])
      .maybeSingle();

    if (!sub) return;

    // Find published magazines the user does not already have an entitlement for
    const { data: magazines } = await supabase
      .from('magazines')
      .select('id')
      .eq('status', 'published')
      .lte('published_at', new Date().toISOString());

    if (!magazines?.length) return;

    for (const mag of magazines) {
      await supabase
        .from('magazine_entitlements')
        .upsert(
          {
            user_id: customerRow.user_id,
            magazine_id: mag.id,
            source: 'subscription_release',
            stripe_subscription_id: sub.stripe_subscription_id,
            granted_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,magazine_id', ignoreDuplicates: true },
        );
    }

    console.info(`Magazine release grants applied for user ${customerRow.user_id}`);
  } catch (err) {
    console.error('grantMagazineReleasesToSubscriber error:', err);
  }
}
