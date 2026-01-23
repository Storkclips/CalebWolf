import { Link } from 'react-router-dom';
import { useState } from 'react';
import Layout from '../components/Layout';
import { useStore } from '../store/StoreContext';

const CheckoutPage = () => {
  const { cart, cartTotal, creditBalance, checkout } = useStore();
  const [status, setStatus] = useState('');

  const handleCheckout = () => {
    const result = checkout();
    setStatus(result.message);
  };

  return (
    <Layout>
      <section className="hero slim">
        <p className="eyebrow">Checkout</p>
        <h1>Finish your download order</h1>
        <p className="lead">
          Securely spend credits on your selected images. You can still remove items before
          confirming.
        </p>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Order summary</p>
            <h2>Cart total: {cartTotal} credits</h2>
            <p className="muted">Credits available: {creditBalance}</p>
          </div>
          <Link className="ghost" to="/cart">
            Return to cart
          </Link>
        </div>

        {cart.length === 0 ? (
          <p className="muted">Your cart is empty. Add images from a gallery to proceed.</p>
        ) : (
          <div className="checkout-panel">
            <div className="checkout-list">
              {cart.map((item) => (
                <div key={item.id} className="checkout-line">
                  <div className="cart-line-info">
                    <div className="cart-thumb" style={{ backgroundImage: `url(${item.preview})` }} />
                    <div>
                      <div className="cart-title">{item.title}</div>
                      <div className="muted small">{item.collectionTitle}</div>
                    </div>
                  </div>
                  <div className="cart-line-actions">
                    <span className="tag">{item.price} credits</span>
                    <span className="muted">Qty: {item.quantity}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="checkout-summary">
              <div className="summary-line">
                <span>Credits available</span>
                <strong>{creditBalance} credits</strong>
              </div>
              <div className="summary-line">
                <span>Cart total</span>
                <strong>{cartTotal} credits</strong>
              </div>
              <button className="btn" type="button" onClick={handleCheckout} disabled={cartTotal === 0}>
                Complete checkout
              </button>
              <p className="muted small">Downloads unlock immediately after checkout in this demo.</p>
            </div>
          </div>
        )}
        {status && <div className="notice">{status}</div>}
      </section>
    </Layout>
  );
};

export default CheckoutPage;
