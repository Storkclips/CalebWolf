import { Link, NavLink } from 'react-router-dom';
import { useStore } from '../store/StoreContext';

const Layout = ({ children, className = '' }) => {
  const { creditBalance, cart } = useStore();
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className={`page ${className}`.trim()}>
      <header className="topbar">
        <Link to="/" className="logo">
          Caleb Wolf
        </Link>
        <nav className="nav">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/collections">Collections</NavLink>
          <NavLink to="/pricing">Pricing</NavLink>
          <NavLink to="/about">About</NavLink>
          <NavLink to="/blog">Blog</NavLink>
          <NavLink to="/contact">Contact</NavLink>
          <NavLink to="/cart" className="cart-link">
            Cart ({cartCount})
          </NavLink>
        </nav>
        <div className="topbar-actions">
          <span className="pill credits">{creditBalance} credits</span>
          <Link className="pill" to="/pricing">
            Book a session
          </Link>
        </div>
      </header>
      <main>{children}</main>
      <footer className="footer">
        <div>
          <div className="logo">Caleb Wolf</div>
          <p>Fine-art photography for weddings, portraits, and brands.</p>
        </div>
        <div className="footer-links">
          <Link to="/">Home</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/about">About</Link>
          <Link to="/blog">Blog</Link>
          <Link to="/contact">Contact</Link>
        </div>
        <div className="footer-meta">
          <p>Based in Portland, available worldwide.</p>
          <p className="muted">© 2024 Caleb Wolf Photography</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
