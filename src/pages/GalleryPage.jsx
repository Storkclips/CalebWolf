import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { useStore } from '../store/StoreContext';
import { normalizedClientCollections, normalizedCollections } from '../utils/collections';

const GalleryPage = () => {
  const { collectionId } = useParams();
  const navigate = useNavigate();
  const { addToCart, cart, creditBalance } = useStore();
  const [message, setMessage] = useState('');
  const [lightbox, setLightbox] = useState(null);
  const [search, setSearch] = useState('');

  const allCollections = [...normalizedClientCollections, ...normalizedCollections];
  const collection = allCollections.find((item) => item.id === collectionId);
  const curatedImages = (collection?.imageObjects ?? []).map((image, index) => ({
    ...image,
    id: `${collection?.id ?? 'c'}-${index + 1}`,
    title: image.title || `Frame ${index + 1}`,
  }));

  useEffect(() => {
    if (!collection) navigate('/collections');
  }, [collection, navigate]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 2600);
    return () => clearTimeout(timer);
  }, [message]);

  if (!collection) return null;

  const filtered = curatedImages.filter((img) =>
    search ? img.title.toLowerCase().includes(search.toLowerCase()) : true
  );

  const handleAdd = (image) => {
    addToCart({
      id: image.id,
      title: image.title,
      price: image.price,
      collectionTitle: collection.title,
      preview: image.src,
    });
    setMessage('Added to cart');
  };

  const handleAddBundle = () => {
    if (!collection.bulkBundle) return;
    addToCart({
      id: `${collection.id}-bundle`,
      title: `${collection.title} — ${collection.bulkBundle.label}`,
      price: collection.bulkBundle.price,
      collectionTitle: collection.title,
      preview: collection.cover,
    });
    setMessage('Added bundle to cart');
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
                placeholder={`Search ${collection.title}...`}
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
                {collection.title}
              </Link>
              {collection.bulkBundle && (
                <button className="ss-bundle-btn" type="button" onClick={handleAddBundle}>
                  Bundle ({collection.bulkBundle.price} cr)
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="ss-collection-hero">
          <div className="ss-collection-hero-inner">
            <p className="eyebrow">{collection.category}</p>
            <h1>{collection.title}</h1>
            <p className="lead">{collection.description}</p>
            <div className="chips">
              {collection.tags.map((tag) => (
                <span key={tag} className="chip">{tag}</span>
              ))}
            </div>
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
                  <button className="ss-cart-btn" type="button" onClick={() => handleAdd(image)}>
                    + Cart
                  </button>
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
                <p className="ss-lb-meta">{collection.title} &middot; {lightbox.price} credits</p>
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

export default GalleryPage;
