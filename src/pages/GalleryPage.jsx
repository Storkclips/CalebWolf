import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { useStore } from '../store/StoreContext';
import { useThemes, useGalleryImagesByTheme } from '../hooks/useGallery';
import PrintOrderModal from '../components/PrintOrderModal';

const GalleryPage = () => {
  const { collectionId } = useParams();
  const navigate = useNavigate();
  const { addToCart, cart } = useStore();
  const { themes } = useThemes();
  const [message, setMessage] = useState('');
  const [lightbox, setLightbox] = useState(null);
  const [printOrderImage, setPrintOrderImage] = useState(null);
  const [search, setSearch] = useState('');

  const theme = themes.find((t) => t.slug === collectionId);
  const { images } = useGalleryImagesByTheme(theme?.id);

  const curatedImages = images.map((image) => ({
    id: image.id,
    src: image.url,
    title: image.title,
    price: image.price,
  }));

  useEffect(() => {
    if (!theme && themes.length > 0) navigate('/collections');
  }, [theme, themes, navigate]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 2600);
    return () => clearTimeout(timer);
  }, [message]);

  if (!theme) return null;

  const filtered = curatedImages.filter((img) =>
    search ? img.title.toLowerCase().includes(search.toLowerCase()) : true
  );

  const handleAdd = (image) => {
    addToCart({
      id: image.id,
      title: image.title,
      price: image.price,
      collectionTitle: theme.name,
      preview: image.src,
    });
    setMessage('Added to cart');
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
                placeholder={`Search ${theme.name}...`}
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
              <Link className="ss-active-theme-tag" to="/collections">
                {theme.name}
              </Link>
            </div>
          </div>
        </div>

        <div className="ss-collection-hero">
          <div className="ss-collection-hero-inner">
            <p className="eyebrow">Theme</p>
            <h1>{theme.name}</h1>
            <p className="lead">Browse {theme.name.toLowerCase()} photography</p>
            <div className="ss-collection-hero-actions">
              <Link className="ghost" to="/collections">Back to collections</Link>
              <Link className="pill" to="/cart">View cart ({cart.length})</Link>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="ss-empty">
            <p>No images match your search.</p>
            <button className="ghost" type="button" onClick={() => setSearch('')}>Clear search</button>
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
                  <img src={image.src} alt={image.title} loading="lazy" />
                  <div className="ss-card-hover">
                    <div className="ss-card-hover-top">
                      <span className="ss-card-price">{image.price} credits</span>
                    </div>
                    <div className="ss-card-hover-bottom">
                      <span className="ss-card-title">{image.title}</span>
                    </div>
                  </div>
                </button>
                <div className="ss-card-bar">
                  <span className="ss-card-bar-title">{image.title}</span>
                  <div className="ss-card-bar-actions">
                    <button className="ss-cart-btn" type="button" onClick={() => handleAdd(image)}>
                      + Cart
                    </button>
                    <button
                      className="ss-print-btn"
                      type="button"
                      onClick={() => setPrintOrderImage({ id: image.id, title: image.title, url: image.src })}
                    >
                      Print
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
              <img src={lightbox.src} alt={lightbox.title} />
            </div>
            <div className="ss-lb-footer">
              <div className="ss-lb-info">
                <p className="ss-lb-title">{lightbox.title}</p>
                <p className="ss-lb-meta">{theme.name} &middot; {lightbox.price} credits</p>
              </div>
              <div className="ss-lb-actions">
                <button className="pill" type="button" onClick={() => { handleAdd(lightbox); setLightbox(null); }}>
                  Add to cart
                </button>
                <button
                  className="ss-lb-print-btn"
                  type="button"
                  onClick={() => { setLightbox(null); setPrintOrderImage({ id: lightbox.id, title: lightbox.title, url: lightbox.src }); }}
                >
                  Order print
                </button>
              </div>
            </div>
          </div>
        </div>
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

export default GalleryPage;
