import React, { useState } from 'react';
import { STRIPE_PRODUCTS, formatPrice } from '../stripe-config';
import { useAuth } from '../hooks/useAuth';

export const CreditsPage: React.FC = () => {
  const { user } = useAuth();
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);

  const handlePurchase = async (priceId: string) => {
    if (!user) {
      alert('Please sign in to purchase credits');
      return;
    }

    setLoadingPriceId(priceId);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price_id: priceId,
          success_url: `${window.location.origin}/success`,
          cancel_url: `${window.location.origin}/credits`,
          mode: 'payment',
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout process. Please try again.');
    } finally {
      setLoadingPriceId(null);
    }
  };

  return (
    <div className="page">
      <main>
        <section className="section">
          <div className="section-head">
            <div>
              <h1>Purchase Credits</h1>
              <p className="lead">Choose a credit package that fits your needs</p>
            </div>
          </div>

          <div className="grid credits-grid">
            {STRIPE_PRODUCTS.map((product) => (
              <div key={product.id} className="card credits-card">
                <div className="card-body">
                  <div className="credits-card-header">
                    <div className="credits-amount">{product.credits}</div>
                    <div className="small muted">credits</div>
                  </div>
                  
                  <h3>{product.name}</h3>
                  <p className="muted">{product.description}</p>
                  
                  <div className="credits-price">
                    <span className="price">{formatPrice(product.price, product.currency)}</span>
                  </div>

                  <ul className="credits-features">
                    <li>Instant credit delivery</li>
                    <li>No expiration date</li>
                    <li>Use for any service</li>
                  </ul>

                  <button
                    className="btn credits-buy-btn"
                    onClick={() => handlePurchase(product.priceId)}
                    disabled={loadingPriceId === product.priceId}
                  >
                    {loadingPriceId === product.priceId ? 'Processing...' : 'Purchase Now'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};