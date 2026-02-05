import React, { useState } from 'react';
import { StripeProduct } from '../stripe-config';
import { createCheckoutSession } from '../lib/stripe';

interface ProductCardProps {
  product: StripeProduct;
}

export function ProductCard({ product }: ProductCardProps) {
  const [loading, setLoading] = useState(false);

  const handlePurchase = async () => {
    setLoading(true);
    try {
      const successUrl = `${window.location.origin}/success`;
      const cancelUrl = window.location.href;
      
      const { url } = await createCheckoutSession({
        priceId: product.priceId,
        mode: product.mode,
        successUrl,
        cancelUrl
      });

      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-body">
        <h3>{product.name}</h3>
        <p className="lead">{product.description}</p>
        <div className="price">
          {product.currencySymbol}{product.price.toFixed(2)}
          {product.mode === 'subscription' && '/month'}
        </div>
        <button 
          onClick={handlePurchase} 
          className="btn"
          disabled={loading}
        >
          {loading ? 'Processing...' : `Subscribe for ${product.currencySymbol}${product.price.toFixed(2)}/month`}
        </button>
      </div>
    </div>
  );
}