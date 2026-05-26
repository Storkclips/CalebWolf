import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { useStore } from '../store/StoreContext';
import { useThemes, useAllGalleryImages } from '../hooks/useGallery';
import PrintOrderModal from '../components/PrintOrderModal';
import GalleryLightbox from '../components/GalleryLightbox';

const ExplorePage = () => {
  const { addToCart, isOwned } = useStore();
  const { themes, loading: themesLoading } = useThemes();
  const { images, loading: imagesLoading } = useAllGalleryImages();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTheme, setActiveTheme] = useState(searchParams.get('theme') || null);
  const [search, setSearch] = useState('');
  const [lightbox, setLightbox] = useState(null);
  const imageParam = searchParams.get('image');
  const [message, setMessage] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [printOrderImage, setPrintOrderImage] = useState(null);
  const panelRef = useRef(null);

  useEffect(() => {
    const param = searchParams.get('theme');
    if (param) setActiveTheme(param);
  }, [searchParams]);

  // Open lightbox from ?image= param once images are loaded
  useEffect(() => {
    if (!imageParam || images.length === 0) return;
    const found = images.find((i) => i.id === imageParam);
    if (found) setLightbox(found);
  }, [imageParam, images]);

  const openLightbox = (image) => {
    setLightbox(image);
    setSearchParams((prev) => { const next = new URLSearchParams(prev); next.set('image', image.id); return next; });
  };

  const closeLightbox = () => {
    setLightbox(null);
    setSearchParams((prev) => { const next = new URLSearchParams(prev); next.delete('image'); return next; });
  };

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
        if (lightbox) closeLightbox();
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
    const result = addToCart({
      id: image.id,
      title: image.title,
      price: image.price,
      collectionTitle: image.themes?.name ?? 'Gallery',
      preview: image.url,
    });
    if (result?.alreadyOwned) {
      setMessage('You already own this image.');
    } else {
      setMessage('Added to cart');
    }
    setTimeout(() => setMessage(''), 2400);
  };

  const navigateLightbox = (dir) => {
    if (!lightbox) return;
    const idx = filtered.findIndex((i) => i.id === lightbox.id);
    const next = idx + dir;
    if (next >= 0 && next < filtered.length) openLightbox(filtered[next]);
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
                  onClick={() => openLightbox(image)}
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
                  <div className="ss-card-bar-actions">
                    {isOwned(image.id) ? (
                      <span className="ss-owned-badge">Owned</span>
                    ) : (
                      <button className="ss-cart-btn" type="button" onClick={() => handleAdd(image)}>
                        + Cart
                      </button>
                    )}
                    <button
                      className="ss-print-btn"
                      type="button"
                      onClick={() => setPrintOrderImage({ id: image.id, title: image.title, url: image.url })}
                    >
                      Print
                    </button>
                  </div>
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
        <GalleryLightbox
          image={lightbox}
          imageUrlKey="url"
          imageList={filtered}
          onClose={closeLightbox}
          onNavigate={(dir) => navigateLightbox(dir)}
          meta={`${lightbox.themes?.name} · ${lightbox.price} credits`}
          footer={
            <>
              {isOwned(lightbox.id) ? (
                <span className="ss-owned-badge">Already owned</span>
              ) : (
                <button className="pill" type="button" onClick={() => { handleAdd(lightbox); closeLightbox(); }}>
                  Add to cart
                </button>
              )}
              <button
                className="ss-lb-print-btn"
                type="button"
                onClick={() => { closeLightbox(); setPrintOrderImage({ id: lightbox.id, title: lightbox.title, url: lightbox.url }); }}
              >
                Order print
              </button>
            </>
          }
        />
      )}

      {printOrderImage && (
        <PrintOrderModal
          image={printOrderImage}
          onClose={() => setPrintOrderImage(null)}
        />
      )}

      {message && <div className="toast" role="status">{message}</div>}
    </Layout>
  );
};

export default ExplorePage;
