import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { useStore } from '../store/StoreContext';
import { useThemes, useAllGalleryImages } from '../hooks/useGallery';

const ExplorePage = () => {
  const { addToCart } = useStore();
  const { themes, loading: themesLoading } = useThemes();
  const { images, loading: imagesLoading } = useAllGalleryImages();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTheme, setActiveTheme] = useState(searchParams.get('theme') || null);
  const [search, setSearch] = useState('');
  const [lightbox, setLightbox] = useState(null);
  const [message, setMessage] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    const param = searchParams.get('theme');
    if (param) setActiveTheme(param);
  }, [searchParams]);

  useEffect(() => {
    const handleClick = (e) => {
      if (panelOpen && panelRef.current && !panelRef.current.contains(e.target)) {
        setPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [panelOpen]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        if (lightbox) setLightbox(null);
        else if (panelOpen) setPanelOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightbox, panelOpen]);

  const filtered = images.filter((img) => {
    const matchesTheme = activeTheme ? img.themes?.slug === activeTheme : true;
    const matchesSearch = search
      ? img.title.toLowerCase().includes(search.toLowerCase()) ||
        img.themes?.name?.toLowerCase().includes(search.toLowerCase())
      : true;
    return matchesTheme && matchesSearch;
  });

  const activeThemeName = themes.find((t) => t.slug === activeTheme)?.name;

  const selectTheme = (slug) => {
    setActiveTheme(slug);
    if (slug) {
      setSearchParams({ theme: slug });
    } else {
      setSearchParams({});
    }
    setPanelOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAdd = (image) => {
    addToCart({
      id: image.id,
      title: image.title,
      price: image.price,
      collectionTitle: image.themes?.name ?? 'Gallery',
      preview: image.url,
    });
    setMessage('Added to cart');
    setTimeout(() => setMessage(''), 2400);
  };

  const navigateLightbox = (dir) => {
    if (!lightbox) return;
    const idx = filtered.findIndex((i) => i.id === lightbox.id);
    const next = idx + dir;
    if (next >= 0 && next < filtered.length) setLightbox(filtered[next]);
  };

  return (
    <Layout>
      <div className="ss-page">
        <div className="ss-topbar">
          <div className="ss-topbar-inner">
            <div className="ss-search-wrap">
              <svg className="ss-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                className="ss-search"
                type="text"
                placeholder="Search images..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className="ss-search-clear" type="button" onClick={() => setSearch('')}>
                  ✕
                </button>
              )}
            </div>
            <div className="ss-topbar-meta">
              <span className="ss-result-count">{filtered.length} image{filtered.length !== 1 ? 's' : ''}</span>
              {activeTheme && (
                <button className="ss-active-theme-tag" type="button" onClick={() => selectTheme(null)}>
                  {activeThemeName} ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {imagesLoading ? (
          <div className="ss-loading">
            <div className="ss-spinner" />
            <p>Loading images...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="ss-empty">
            <p>No images match your search.</p>
            <button className="ghost" type="button" onClick={() => { setSearch(''); selectTheme(null); }}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="ss-grid">
            {filtered.map((image) => (
              <div key={image.id} className="ss-card">
                <button
                  type="button"
                  className="ss-card-img-btn"
                  onClick={() => setLightbox(image)}
                >
                  <img src={image.url} alt={image.title} loading="lazy" />
                  <div className="ss-card-hover">
                    <div className="ss-card-hover-top">
                      <span className="ss-card-price">{image.price} credits</span>
                    </div>
                    <div className="ss-card-hover-bottom">
                      <span className="ss-card-title">{image.title}</span>
                      <span className="ss-card-theme">{image.themes?.name}</span>
                    </div>
                  </div>
                </button>
                <div className="ss-card-bar">
                  <span className="ss-card-bar-title">{image.title}</span>
                  <button className="ss-cart-btn" type="button" onClick={() => handleAdd(image)}>
                    + Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className={`ss-theme-panel ${panelOpen ? 'open' : ''}`} ref={panelRef}>
          {!panelOpen ? (
            <button className="ss-theme-toggle" type="button" onClick={() => setPanelOpen(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
              <span>Themes</span>
              {activeTheme && <span className="ss-theme-dot" />}
            </button>
          ) : (
            <div className="ss-theme-panel-content">
              <div className="ss-theme-panel-header">
                <h3>Browse by Theme</h3>
                <button className="icon-button" type="button" onClick={() => setPanelOpen(false)}>
                  ✕
                </button>
              </div>
              <div className="ss-theme-list">
                <button
                  className={`ss-theme-item ${!activeTheme ? 'active' : ''}`}
                  type="button"
                  onClick={() => selectTheme(null)}
                >
                  <span>All Images</span>
                  <span className="ss-theme-count">{images.length}</span>
                </button>
                {themes.map((theme) => {
                  const count = images.filter((i) => i.themes?.slug === theme.slug).length;
                  return (
                    <button
                      key={theme.id}
                      className={`ss-theme-item ${activeTheme === theme.slug ? 'active' : ''}`}
                      type="button"
                      onClick={() => selectTheme(theme.slug)}
                    >
                      <span>{theme.name}</span>
                      <span className="ss-theme-count">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {lightbox && (
        <div className="ss-lightbox" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) setLightbox(null); }}>
          <div className="ss-lightbox-panel">
            <button className="ss-lb-close" type="button" onClick={() => setLightbox(null)}>✕</button>
            <button
              className="ss-lb-nav ss-lb-prev"
              type="button"
              onClick={() => navigateLightbox(-1)}
              disabled={filtered.findIndex((i) => i.id === lightbox.id) === 0}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              className="ss-lb-nav ss-lb-next"
              type="button"
              onClick={() => navigateLightbox(1)}
              disabled={filtered.findIndex((i) => i.id === lightbox.id) === filtered.length - 1}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
            <div className="ss-lb-media">
              <img src={lightbox.url} alt={lightbox.title} />
            </div>
            <div className="ss-lb-footer">
              <div className="ss-lb-info">
                <p className="ss-lb-title">{lightbox.title}</p>
                <p className="ss-lb-meta">{lightbox.themes?.name} &middot; {lightbox.price} credits</p>
              </div>
              <div className="ss-lb-actions">
                <button className="pill" type="button" onClick={() => { handleAdd(lightbox); setLightbox(null); }}>
                  Add to cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {message && <div className="toast" role="status">{message}</div>}
    </Layout>
  );
};

export default ExplorePage;
