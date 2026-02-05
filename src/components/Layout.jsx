import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useStore } from '../store/StoreContext';
import { useAuth } from '../store/AuthContext';

const Layout = ({ children, className = '' }) => {
  const { creditBalance, cart } = useStore();
  const { user, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const [pricingOpen, setPricingOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setPricingOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

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
          <div className="nav-dropdown" ref={dropdownRef}>
            <button
              type="button"
              className={`nav-dropdown-trigger${pricingOpen ? ' open' : ''}`}
              onClick={() => setPricingOpen((v) => !v)}
            >
              Pricing
              <span className="nav-dropdown-arrow">{pricingOpen ? '\u25B4' : '\u25BE'}</span>
            </button>
            {pricingOpen && (
              <div className="nav-dropdown-menu">
                <Link to="/pricing" onClick={() => setPricingOpen(false)}>
                  Session Pricing
                </Link>
                <Link to="/buy-credits" onClick={() => setPricingOpen(false)}>
                  Buy Credits
                </Link>
              </div>
            )}
          </div>
          <NavLink to="/about">About</NavLink>
          <NavLink to="/blog">Blog</NavLink>
          <NavLink to="/contact">Contact</NavLink>
          <NavLink to="/cart" className="cart-link">
            Cart ({cartCount})
          </NavLink>
          <NavLink to="/admin" className="admin-link">
            Admin
          </NavLink>
        </nav>
        <div className="topbar-actions">
          {!loading && user ? (
            <>
              <Link className="pill credits" to="/buy-credits">{creditBalance} credits</Link>
              <span className="pill user-pill">{profile?.display_name || user.email}</span>
              <button className="pill sign-out-btn" type="button" onClick={handleSignOut}>
                Sign out
              </button>
            </>
          ) : !loading ? (
            <>
              <Link className="pill" to="/auth">
                Sign in
              </Link>
              <Link className="pill credits" to="/buy-credits">
                Buy Credits
              </Link>
            </>
          ) : null}
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
          <Link to="/buy-credits">Buy Credits</Link>
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
