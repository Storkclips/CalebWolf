import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getProductByPriceId } from '../stripe-config';

interface SubscriptionData {
  subscription_status: string;
  price_id: string | null;
  current_period_end: number | null;
  cancel_at_period_end: boolean;
}

export function SubscriptionStatus() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const { data, error } = await supabase
        .from('stripe_user_subscriptions')
        .select('subscription_status, price_id, current_period_end, cancel_at_period_end')
        .maybeSingle();

      if (error) throw error;
      setSubscription(data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="pill">Loading subscription...</div>;
  }

  if (!subscription || subscription.subscription_status === 'not_started') {
    return <div className="pill">No active subscription</div>;
  }

  const product = subscription.price_id ? getProductByPriceId(subscription.price_id) : null;
  const planName = product?.name || 'Unknown Plan';

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'trialing':
        return 'Trial';
      case 'past_due':
        return 'Past Due';
      case 'canceled':
        return 'Canceled';
      case 'incomplete':
        return 'Incomplete';
      default:
        return status;
    }
  };

  return (
    <div className="pill">
      {planName} - {getStatusDisplay(subscription.subscription_status)}
      {subscription.cancel_at_period_end && ' (Canceling)'}
    </div>
  );
}