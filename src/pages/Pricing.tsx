import React from 'react';
import { ProductCard } from '../components/ProductCard';
import { stripeProducts } from '../stripe-config';

export function Pricing() {
  return (
    <div className="page">
      <main>
        <section className="section">
          <div className="section-head">
            <div>
              <h2>Pricing Plans</h2>
              <p className="lead">Choose the plan that works best for you.</p>
            </div>
          </div>
          
          <div className="grid pricing-grid">
            {stripeProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}