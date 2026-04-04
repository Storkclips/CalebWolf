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
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pricingRef = useRef(null);
  const collectionsRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (pricingRef.current && !pricingRef.current.contains(e.target)) {
        setPricingOpen(false);
      }
      if (collectionsRef.current && !collectionsRef.current.contains(e.target)) {
        setCollectionsOpen(false);
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
    <div className={`site-wrap ${className}`.trim()}>
      <header className="site-nav">
        <div className="site-nav-inner">
          <Link to="/" className="site-logo">Caleb Wolf</Link>

          <nav className="site-nav-links">
            <NavLink to="/" end className={({ isActive }) => isActive ? 'site-nav-link active' : 'site-nav-link'}>
              Home
            </NavLink>

            <div className="site-dropdown" ref={collectionsRef}>
              <button
                type="button"
                className={`site-nav-link site-dropdown-trigger${collectionsOpen ? ' open' : ''}`}
                onClick={() => setCollectionsOpen((v) => !v)}
              >
                Collections
                <svg className="site-chevron" width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {collectionsOpen && (
                <div className="site-dropdown-panel">
                  <Link to="/my-library" className="site-dropdown-item" onClick={() => setCollectionsOpen(false)}>
                    <span className="site-dropdown-item-title">Your Library</span>
                    <span className="site-dropdown-item-desc">Your personal gallery</span>
                  </Link>
                  <Link to="/collections" className="site-dropdown-item" onClick={() => setCollectionsOpen(false)}>
                    <span className="site-dropdown-item-title">Full Signature Work</span>
                    <span className="site-dropdown-item-desc">Browse all collections</span>
                  </Link>
                  <Link to="/explore" className="site-dropdown-item" onClick={() => setCollectionsOpen(false)}>
                    <span className="site-dropdown-item-title">Explore by Theme</span>
                    <span className="site-dropdown-item-desc">Filter by subject</span>
                  </Link>
                </div>
              )}
            </div>

            <div className="site-dropdown" ref={pricingRef}>
              <button
                type="button"
                className={`site-nav-link site-dropdown-trigger${pricingOpen ? ' open' : ''}`}
                onClick={() => setPricingOpen((v) => !v)}
              >
                Pricing
                <svg className="site-chevron" width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {pricingOpen && (
                <div className="site-dropdown-panel">
                  <Link to="/pricing" className="site-dropdown-item" onClick={() => setPricingOpen(false)}>
                    <span className="site-dropdown-item-title">Session Pricing</span>
                    <span className="site-dropdown-item-desc">Photography packages</span>
                  </Link>
                  <Link to="/buy-credits" className="site-dropdown-item" onClick={() => setPricingOpen(false)}>
                    <span className="site-dropdown-item-title">Buy Credits</span>
                    <span className="site-dropdown-item-desc">Download individual images</span>
                  </Link>
                </div>
              )}
            </div>

            <NavLink to="/about" className={({ isActive }) => isActive ? 'site-nav-link active' : 'site-nav-link'}>About</NavLink>
            <NavLink to="/blog" className={({ isActive }) => isActive ? 'site-nav-link active' : 'site-nav-link'}>Blog</NavLink>
            <NavLink to="/contact" className={({ isActive }) => isActive ? 'site-nav-link active' : 'site-nav-link'}>Contact</NavLink>
          </nav>

          <div className="site-nav-actions">
            <NavLink to="/cart" className="site-cart-btn">
              Cart {cartCount > 0 && <span className="site-cart-badge">{cartCount}</span>}
            </NavLink>
            {profile?.is_admin && (
              <NavLink to="/admin" className="site-admin-btn">Admin</NavLink>
            )}
            {!loading && user ? (
              <>
                <Link className="site-credits-btn" to="/buy-credits">{creditBalance} credits</Link>
                <button className="site-signout-btn" type="button" onClick={handleSignOut}>Sign out</button>
              </>
            ) : !loading ? (
              <Link className="site-signin-btn" to="/auth">Sign in</Link>
            ) : null}
          </div>
        </div>
      </header>

      <main className="site-main">{children}</main>

      <footer className="site-footer">
        <div className="site-footer-inner">
          <div className="site-footer-brand">
            <div className="site-logo">Caleb Wolf</div>
            <p>Fine-art photography for landscapes, weddings, and brands.</p>
          </div>
          <nav className="site-footer-links">
            <Link to="/">Home</Link>
            <Link to="/pricing">Pricing</Link>
            <Link to="/buy-credits">Buy Credits</Link>
            <Link to="/about">About</Link>
            <Link to="/blog">Blog</Link>
            <Link to="/contact">Contact</Link>
          </nav>
          <div className="site-footer-meta">
            <p>Based in Portland, available worldwide.</p>
            <p>© 2026 Caleb Wolf Photography</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
