import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useThemes, useAllGalleryImages } from '../hooks/useGallery';
import { useAdminCollections } from '../hooks/useAdminCollections';
import { useStore } from '../store/StoreContext';
import PrintOrderModal from '../components/PrintOrderModal';
import GalleryLightbox from '../components/GalleryLightbox';
import { usePageSeo } from '../contexts/SeoContext';

const CollectionsPage = () => {
  usePageSeo('collections', {
    site_title: 'Collections — Caleb Wolf Photography',
    meta_description: 'Browse curated photography collections by theme — landscapes, portraits, wilderness, and more. Purchase individual images or unlock private galleries.',
    og_title: 'Photography Collections — Caleb Wolf',
    og_description: 'Curated galleries of cinematic photography, available for purchase and instant download.',
  });

  const { themes } = useThemes();
  const { images, loading: imagesLoading } = useAllGalleryImages();
  const { collections: adminCollections } = useAdminCollections();
  const { addToCart, isOwned } = useStore();
  const [lightbox, setLightbox] = useState(null);
  const [printOrderImage, setPrintOrderImage] = useState(null);
  const [message, setMessage] = useState('');
  const [activeTheme, setActiveTheme] = useState(null);

  const sellingCollections = adminCollections.filter((c) => c.is_selling && c.is_published);
  const publishedThemes = themes.filter((t) => t.is_published);

  const filteredImages = activeTheme
    ? images.filter((img) => img.themes?.slug === activeTheme)
    : images;

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
    const idx = filteredImages.findIndex((i) => i.id === lightbox.id);
    const next = idx + dir;
    if (next >= 0 && next < filteredImages.length) setLightbox(filteredImages[next]);
  };

  return (
    <Layout>
      {/* Hero */}
      <div className="coll-hero">
        <div className="coll-hero-inner">
          <p className="eyebrow">Portfolio</p>
          <h1>Full Galleries</h1>
          <p className="lead">
            Browse curated collections by theme or explore every image in the shop.
          </p>
          <div className="coll-hero-actions">
            <a href="#shop" className="btn">Browse the shop</a>
            <Link className="ghost" to="/contact">Request a private gallery</Link>
          </div>
        </div>
      </div>

      {/* Theme collections — visual grid */}
      <section className="coll-section" id="galleries">
        <div className="coll-section-head">
          <div>
            <p className="eyebrow">Curated collections</p>
            <h2>Browse by theme</h2>
            <p className="muted">Select a collection to open the full gallery.</p>
          </div>
        </div>
        <div className="coll-themes-grid">
          {publishedThemes.map((theme) => {
            const themeImages = images.filter((i) => i.themes?.slug === theme.slug);
            const cover = theme.cover_url || themeImages[0]?.url;
            return (
              <Link key={theme.id} className="coll-theme-card" to={`/collections/${theme.slug}`}>
                {cover && (
                  <div className="coll-theme-cover" style={{ backgroundImage: `url(${cover})` }} />
                )}
                <div className="coll-theme-overlay" />
                <div className="coll-theme-body">
                  <span className="coll-theme-count">{themeImages.length} images</span>
                  <h3 className="coll-theme-title">{theme.name}</h3>
                  <span className="coll-theme-cta">View collection →</span>
                </div>
              </Link>
            );
          })}

          {sellingCollections.map((c) => (
            <Link key={c.id} className="coll-theme-card" to={`/collections/${c.slug}`}>
              {c.cover_url && (
                <div className="coll-theme-cover" style={{ backgroundImage: `url(${c.cover_url})` }} />
              )}
              <div className="coll-theme-overlay" />
              <div className="coll-theme-body">
                {c.bulk_bundle_label && <span className="coll-theme-count">{c.bulk_bundle_label}</span>}
                <h3 className="coll-theme-title">{c.title}</h3>
                <span className="coll-theme-cta">View collection →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Shop — all individual images */}
      <section className="coll-section coll-section--shop" id="shop">
        <div className="coll-section-head">
          <div>
            <p className="eyebrow">Signature work</p>
            <h2>Shop individual images</h2>
            <p className="muted">Purchase any image with credits. Instant download after checkout.</p>
          </div>
          <Link className="ghost" to="/explore">Full explore view</Link>
        </div>

        {/* Theme filter pills */}
        <div className="coll-filter-row">
          <button
            type="button"
            className={`coll-filter-pill${!activeTheme ? ' active' : ''}`}
            onClick={() => setActiveTheme(null)}
          >
            All
          </button>
          {publishedThemes.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`coll-filter-pill${activeTheme === t.slug ? ' active' : ''}`}
              onClick={() => setActiveTheme(activeTheme === t.slug ? null : t.slug)}
            >
              {t.name}
            </button>
          ))}
        </div>

        {imagesLoading ? (
          <div className="lib-loading">
            <div className="adm-users-loading-spinner" />
            <p className="muted">Loading images…</p>
          </div>
        ) : filteredImages.length === 0 ? (
          <div className="lib-empty-state">
            <p className="muted">No images in this theme yet.</p>
            <button className="ghost" style={{ marginTop: 12 }} onClick={() => setActiveTheme(null)}>
              Show all
            </button>
          </div>
        ) : (
          <div className="coll-shop-grid">
            {filteredImages.map((image) => (
              <div key={image.id} className="coll-shop-card">
                <button
                  type="button"
                  className="coll-shop-img-btn"
                  onClick={() => setLightbox(image)}
                >
                  <img src={image.url} alt={image.title} loading="lazy" />
                  <div className="coll-shop-hover">
                    <span className="coll-shop-zoom">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        <line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
                      </svg>
                    </span>
                  </div>
                  {isOwned(image.id) && <span className="coll-shop-owned">Owned</span>}
                </button>
                <div className="coll-shop-info">
                  <div className="coll-shop-meta">
                    <p className="coll-shop-title">{image.title}</p>
                    <p className="muted small">{image.themes?.name}</p>
                  </div>
                  <div className="coll-shop-actions">
                    <span className="coll-shop-price">{image.price}cr</span>
                    {isOwned(image.id) ? (
                      <span className="coll-shop-owned-label">Owned</span>
                    ) : (
                      <button className="coll-shop-cart-btn" type="button" onClick={() => handleAdd(image)}>
                        + Add
                      </button>
                    )}
                    <button
                      className="coll-shop-print-btn"
                      type="button"
                      title="Order print"
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

        <div className="lib-footer-actions" style={{ marginTop: 40 }}>
          <Link className="ghost" to="/explore">Open full shop view</Link>
          <Link className="pill" to="/buy-credits">Buy credits</Link>
        </div>
      </section>

      {/* Lightbox */}
      {lightbox && (
        <GalleryLightbox
          image={lightbox}
          imageUrlKey="url"
          imageList={filteredImages}
          onClose={() => setLightbox(null)}
          onNavigate={(dir) => navigateLightbox(dir)}
          meta={`${lightbox.themes?.name} · ${lightbox.price} credits`}
          footer={
            <>
              {isOwned(lightbox.id) ? (
                <span className="ss-owned-badge">Already owned</span>
              ) : (
                <button className="pill" type="button" onClick={() => { handleAdd(lightbox); setLightbox(null); }}>
                  Add to cart
                </button>
              )}
              <button className="ss-lb-print-btn" type="button"
                onClick={() => { setLightbox(null); setPrintOrderImage({ id: lightbox.id, title: lightbox.title, url: lightbox.url }); }}>
                Order print
              </button>
            </>
          }
        />
      )}

      {printOrderImage && (
        <PrintOrderModal image={printOrderImage} onClose={() => setPrintOrderImage(null)} />
      )}

      {message && <div className="toast" role="status">{message}</div>}
    </Layout>
  );
};

export default CollectionsPage;
