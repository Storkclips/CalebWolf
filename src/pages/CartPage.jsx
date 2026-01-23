import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useStore } from '../store/StoreContext';

const CartPage = () => {
  const { cart, creditBalance, cartTotal, removeFromCart, clearCart } = useStore();

  return (
    <Layout>
      <section className="hero slim">
        <p className="eyebrow">Cart & Credits</p>
        <h1>Review your downloads</h1>
        <p className="lead">
          This demo cart uses credits. We added a starter balance so you can test the flow.
        </p>
      </section>
      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Credits</p>
            <h2>Balance: {creditBalance} credits</h2>
          </div>
          <div className="tag">Cart total: {cartTotal} credits</div>
        </div>
        {cart.length === 0 ? (
          <p className="muted">Your cart is empty. Browse a collection to add images.</p>
        ) : (
          <div className="cart-panel">
            <ul className="cart-list">
              {cart.map((item) => (
                <li key={item.id} className="cart-line">
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
                    <button className="ghost" type="button" onClick={() => removeFromCart(item.id)}>
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="cart-summary">
              <div>
                <p className="muted">Credits available</p>
                <h3>{creditBalance} credits</h3>
              </div>
              <div>
                <p className="muted">Total due</p>
                <h3>{cartTotal} credits</h3>
              </div>
              <div className="cart-summary-actions">
                <button className="ghost" type="button" onClick={clearCart}>
                  Clear cart
                </button>
                <Link className="btn" to="/checkout">
                  Proceed to checkout
                </Link>
              </div>
            </div>
          </div>
        )}
        <p className="muted small">You can review totals here, then finalize payment on the checkout page.</p>
      </section>
    </Layout>
  );
};

export default CartPage;
