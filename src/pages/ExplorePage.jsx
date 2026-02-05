import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useStore } from '../store/StoreContext';
import { useThemes, useAllGalleryImages } from '../hooks/useGallery';

const ExplorePage = () => {
  const { addToCart } = useStore();
  const { themes, loading: themesLoading } = useThemes();
  const { images, loading: imagesLoading } = useAllGalleryImages();
  const [activeTheme, setActiveTheme] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [message, setMessage] = useState('');

  const filtered = activeTheme
    ? images.filter((img) => img.themes?.slug === activeTheme)
    : images;

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

  return (
    <Layout>
      <section className="hero slim">
        <div>
          <p className="eyebrow">Signature Work</p>
          <h1>Browse all images by theme</h1>
          <p className="lead">
            Discover the full catalog. Preview in detail
            and add any image to your cart with a single click.
          </p>
        </div>
      </section>

      {imagesLoading ? (
        <p className="muted" style={{ textAlign: 'center', padding: 48 }}>Loading images...</p>
      ) : filtered.length === 0 ? (
        <p className="muted" style={{ textAlign: 'center', padding: 48 }}>No images found.</p>
      ) : (
        <section className="explore-grid">
          {filtered.map((image) => (
            <figure key={image.id} className="explore-card">
              <button
                type="button"
                className="explore-image-btn"
                onClick={() => setLightbox(image)}
              >
                <img src={image.url} alt={image.title} loading="lazy" />
                <div className="explore-overlay">
                  <span className="explore-overlay-title">{image.title}</span>
                  <span className="tag">{image.price} credits</span>
                </div>
              </button>
              <figcaption className="explore-caption">
                <div>
                  <p className="explore-img-title">{image.title}</p>
                  <p className="muted small">{image.themes?.name}</p>
                </div>
                <button className="ghost" type="button" onClick={() => handleAdd(image)}>
                  + Cart
                </button>
              </figcaption>
            </figure>
          ))}
        </section>
      )}

      {!themesLoading && themes.length > 0 && (
        <section className="section explore-themes-bottom">
          <div className="section-head" style={{ textAlign: 'center' }}>
            <div>
              <p className="eyebrow">Filter</p>
              <h2>Browse by theme</h2>
            </div>
          </div>
          <div className="explore-filters centered">
            <button
              className={`explore-filter-btn${!activeTheme ? ' active' : ''}`}
              type="button"
              onClick={() => setActiveTheme(null)}
            >
              All
            </button>
            {themes.map((theme) => (
              <button
                key={theme.id}
                className={`explore-filter-btn${activeTheme === theme.slug ? ' active' : ''}`}
                type="button"
                onClick={() => {
                  setActiveTheme(theme.slug);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                {theme.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {lightbox && (
        <div className="lightbox overlay" role="dialog" aria-modal="true">
          <div className="lightbox-panel">
            <button
              className="icon-button close"
              type="button"
              onClick={() => setLightbox(null)}
            >
              ✕
            </button>
            <div className="lightbox-media">
              <img src={lightbox.url} alt={lightbox.title} />
            </div>
            <div className="lightbox-details">
              <div>
                <p className="eyebrow">{lightbox.themes?.name}</p>
                <h3>{lightbox.title}</h3>
                <p className="muted small">{lightbox.price} credits</p>
              </div>
              <div className="lightbox-actions">
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
