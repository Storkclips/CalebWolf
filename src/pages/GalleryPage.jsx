import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { useStore } from '../store/StoreContext';
import { useThemes, useGalleryImagesByTheme } from '../hooks/useGallery';
import { useAdminCollections, useCollectionImages } from '../hooks/useAdminCollections';
import PrintOrderModal from '../components/PrintOrderModal';
import { proxyImageUrl, displayImageUrl } from '../lib/supabase';
import GalleryLightbox from '../components/GalleryLightbox';

const GalleryPage = () => {
  const { collectionId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToCart, cart, isOwned } = useStore();
  const { themes } = useThemes();
  const { collections: adminCollections } = useAdminCollections();
  const [message, setMessage] = useState('');
  const [lightbox, setLightbox] = useState(null);
  const [printOrderImage, setPrintOrderImage] = useState(null);
  const [search, setSearch] = useState('');

  const theme = themes.find((t) => t.slug === collectionId);
  const adminCollection = !theme
    ? adminCollections.find((c) => c.slug === collectionId && c.is_selling && c.is_published)
    : null;

  const { images: themeImages } = useGalleryImagesByTheme(theme?.id);
  const { images: collectionImages } = useCollectionImages(adminCollection?.id);

  const isTheme = Boolean(theme);
  const isAdminCollection = Boolean(adminCollection);

  const images = isTheme
    ? themeImages.map((img) => ({
        id: img.id,
        src: img.url,
        webp_url: img.webp_url ?? null,
        title: img.title,
        price: img.price,
      }))
    : collectionImages
        .filter((img) => img.is_published)
        .map((img) => ({
          id: img.id,
          src: img.url,
          webp_url: img.webp_url ?? null,
          title: img.title,
          price: adminCollection?.price_per_image ?? 1,
        }));

  useEffect(() => {
    if (!theme && !adminCollection && themes.length > 0 && adminCollections.length > 0) {
      navigate('/collections');
    }
  }, [theme, adminCollection, themes, adminCollections, navigate]);

  // Open lightbox from ?image= param once on initial load — not on every param change
  const initialImageParam = useRef(searchParams.get('image'));
  useEffect(() => {
    if (!initialImageParam.current || images.length === 0) return;
    const found = images.find((i) => i.id === initialImageParam.current);
    if (found) setLightbox(found);
    initialImageParam.current = null;
  }, [images]);

  const openLightbox = (image) => {
    setLightbox(image);
    setSearchParams((prev) => { const next = new URLSearchParams(prev); next.set('image', image.id); return next; });
  };

  const closeLightbox = () => {
    setLightbox(null);
    setSearchParams((prev) => { const next = new URLSearchParams(prev); next.delete('image'); return next; });
  };

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 2600);
    return () => clearTimeout(timer);
  }, [message]);

  if (!theme && !adminCollection) return null;

  const collectionName = isTheme ? theme.name : adminCollection.title;
  const collectionDescription = isTheme
    ? `Browse ${theme.name.toLowerCase()} photography`
    : adminCollection.description;

  const filtered = images.filter((img) =>
    search ? img.title.toLowerCase().includes(search.toLowerCase()) : true
  );

  const handleAdd = (image) => {
    const result = addToCart({
      id: image.id,
      title: image.title,
      price: image.price,
      collectionTitle: collectionName,
      preview: image.src,
    });
    if (result?.alreadyOwned) {
      setMessage('You already own this image.');
    } else {
      setMessage('Added to cart');
    }
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
                placeholder={`Search ${collectionName}...`}
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
                {collectionName}
              </Link>
            </div>
          </div>
        </div>

        <div className="ss-collection-hero">
          <div className="ss-collection-hero-inner">
            <p className="eyebrow">{isTheme ? 'Theme' : adminCollection.category}</p>
            <h1>{collectionName}</h1>
            <p className="lead">{collectionDescription}</p>
            {isAdminCollection && adminCollection.tags?.length > 0 && (
              <div className="chips">
                {adminCollection.tags.map((tag) => (
                  <span key={tag} className="chip">{tag}</span>
                ))}
              </div>
            )}
            <div className="ss-collection-hero-actions">
              <Link className="ghost" to="/collections">Back to collections</Link>
              <Link className="pill" to="/cart">View cart ({cart.length})</Link>
            </div>
          </div>
        </div>

        {isAdminCollection && adminCollection.bulk_bundle_label && (
          <div className="ss-bulk-banner">
            <div className="ss-bulk-banner-inner">
              <div className="ss-bulk-info">
                <span className="chip">Bulk bundle</span>
                <span className="ss-bulk-label">{adminCollection.bulk_bundle_label}</span>
                {adminCollection.bulk_bundle_price && (
                  <span className="ss-bulk-price">${parseFloat(adminCollection.bulk_bundle_price).toFixed(2)}</span>
                )}
              </div>
              <Link className="pill" to="/cart">Add bundle to cart</Link>
            </div>
          </div>
        )}

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
                  onClick={() => openLightbox(image)}
                >
                  <div className="protected-img" style={{ height: '100%' }} onContextMenu={(e) => e.preventDefault()}>
                    <img src={displayImageUrl(image.src, image.webp_url, 600)} alt={image.title} loading="lazy" />
                  </div>
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
        <GalleryLightbox
          image={lightbox}
          imageUrlKey="src"
          imageList={filtered}
          onClose={closeLightbox}
          onNavigate={(dir) => navigateLightbox(dir)}
          meta={`${collectionName} · ${lightbox.price} credits`}
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
                onClick={() => { closeLightbox(); setPrintOrderImage({ id: lightbox.id, title: lightbox.title, url: lightbox.src }); }}
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

export default GalleryPage;
