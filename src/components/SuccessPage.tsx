import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

export const SuccessPage: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!user) return;

      try {
        // Get the most recent order
        const { data: orders, error } = await supabase
          .from('stripe_user_orders')
          .select('*')
          .eq('customer_id', user.id)
          .order('order_date', { ascending: false })
          .limit(1);

        if (error) throw error;

        if (orders && orders.length > 0) {
          setOrderDetails(orders[0]);
        }

        // Refresh profile to get updated credit balance
        await refreshProfile();
      } catch (error) {
        console.error('Error fetching order details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [user, refreshProfile]);

  if (loading) {
    return (
      <div className="page">
        <main>
          <div className="auth-container">
            <div className="auth-card">
              <div className="auth-header">
                <h1>Processing...</h1>
                <p className="muted">Please wait while we confirm your purchase.</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page">
      <main>
        <div className="auth-container">
          <div className="auth-card">
            <div className="auth-header">
              <h1>🎉 Payment Successful!</h1>
              <p className="muted">Thank you for your purchase. Your credits have been added to your account.</p>
            </div>

            {orderDetails && (
              <div className="section">
                <h3>Order Details</h3>
                <div className="grid">
                  <div>
                    <strong>Amount:</strong> ${(orderDetails.amount_total / 100).toFixed(2)}
                  </div>
                  <div>
                    <strong>Status:</strong> {orderDetails.payment_status}
                  </div>
                  <div>
                    <strong>Order ID:</strong> {orderDetails.order_id}
                  </div>
                </div>
              </div>
            )}

            {profile && (
              <div className="section">
                <h3>Current Balance</h3>
                <div className="credits-amount" style={{ fontSize: '2rem', textAlign: 'center' }}>
                  {profile.credit_balance} credits
                </div>
              </div>
            )}

            <div className="hero-actions">
              <Link to="/" className="btn">
                Continue Shopping
              </Link>
              <Link to="/collections" className="ghost">
                Browse Collections
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};