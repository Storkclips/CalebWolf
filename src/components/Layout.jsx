import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store/StoreContext';
import { useAuth } from '../store/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSiteIdentity } from '../contexts/SiteIdentityContext';

/* Renders the brand mark: SVG, name, or both depending on admin config */
const SiteBrand = ({ className = '' }) => {
  const { mode, siteName, svgPath, viewBox } = useSiteIdentity();
  const showSvg = (mode === 'svg' || mode === 'both') && svgPath;
  const showName = mode === 'name' || mode === 'both';
  return (
    <span className={`site-brand-inner ${className}`.trim()}>
      {showSvg && (
        <svg
          className="site-brand-svg"
          viewBox={viewBox}
          fill="currentColor"
          aria-hidden="true"
        >
          <path d={svgPath} />
        </svg>
      )}
      {showName && <span className="site-brand-name">{siteName}</span>}
    </span>
  );
};

const Layout = ({ children, className = '' }) => {
  const { creditBalance, cart } = useStore();
  const { user, profile, signOut, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pricingRef = useRef(null);
  const collectionsRef = useRef(null);

  useEffect(() => {
    setMobileOpen(false);
    setPricingOpen(false);
    setCollectionsOpen(false);
  }, [location.pathname]);

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

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className={`site-wrap ${className}`.trim()}>
      <header className="site-nav">
        <div className="site-nav-inner">
          <Link to="/" className="site-logo"><SiteBrand /></Link>

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
            <button
              type="button"
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>
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
              <Link className="site-signin-btn" to="/login">Sign in</Link>
            ) : null}
          </div>

          <button
            type="button"
            className={`site-hamburger${mobileOpen ? ' open' : ''}`}
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div className="site-mobile-overlay" onClick={() => setMobileOpen(false)} />
      )}

      <div className={`site-mobile-drawer${mobileOpen ? ' open' : ''}`}>
        <nav className="site-mobile-nav">
          <NavLink to="/" end className="site-mobile-link" onClick={() => setMobileOpen(false)}>Home</NavLink>

          <div className="site-mobile-group">
            <div className="site-mobile-group-label">Collections</div>
            <Link to="/my-library" className="site-mobile-link site-mobile-sub" onClick={() => setMobileOpen(false)}>Your Library</Link>
            <Link to="/collections" className="site-mobile-link site-mobile-sub" onClick={() => setMobileOpen(false)}>Full Signature Work</Link>
            <Link to="/explore" className="site-mobile-link site-mobile-sub" onClick={() => setMobileOpen(false)}>Explore by Theme</Link>
          </div>

          <div className="site-mobile-group">
            <div className="site-mobile-group-label">Pricing</div>
            <Link to="/pricing" className="site-mobile-link site-mobile-sub" onClick={() => setMobileOpen(false)}>Session Pricing</Link>
            <Link to="/buy-credits" className="site-mobile-link site-mobile-sub" onClick={() => setMobileOpen(false)}>Buy Credits</Link>
          </div>

          <NavLink to="/about" className="site-mobile-link" onClick={() => setMobileOpen(false)}>About</NavLink>
          <NavLink to="/blog" className="site-mobile-link" onClick={() => setMobileOpen(false)}>Blog</NavLink>
          <NavLink to="/contact" className="site-mobile-link" onClick={() => setMobileOpen(false)}>Contact</NavLink>
        </nav>

        <div className="site-mobile-footer">
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
          <NavLink to="/cart" className="site-mobile-cart" onClick={() => setMobileOpen(false)}>
            Cart {cartCount > 0 && <span className="site-cart-badge">{cartCount}</span>}
          </NavLink>
          {!loading && user ? (
            <div className="site-mobile-auth">
              <Link className="site-credits-btn" to="/buy-credits" onClick={() => setMobileOpen(false)}>{creditBalance} credits</Link>
              <button className="site-signout-btn" type="button" onClick={handleSignOut}>Sign out</button>
            </div>
          ) : !loading ? (
            <Link className="site-signin-btn" to="/login" onClick={() => setMobileOpen(false)}>Sign in</Link>
          ) : null}
        </div>
      </div>

      <main className="site-main">{children}</main>

      <footer className="site-footer">
        <div className="site-footer-inner">
          <div className="site-footer-brand">
            <div className="site-logo"><SiteBrand /></div>
            <p>Photography for landscapes, portraits, and brands.</p>
          </div>
          <div className="site-footer-meta">
            <p>Based in Salem, available anytime.</p>
            <p>© 2026 Caleb Wolf Photography</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
