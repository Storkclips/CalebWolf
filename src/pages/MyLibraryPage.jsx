import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../store/AuthContext';
import { usePurchasedImages } from '../hooks/useGallery';

const MyLibraryPage = () => {
  const { user } = useAuth();
  const { images, loading } = usePurchasedImages();
  const [lightbox, setLightbox] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (image) => {
    setDownloading(true);
    try {
      const response = await fetch(image.preview);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = blob.type.split('/')[1] || 'jpg';
      a.download = `${image.title.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '-').toLowerCase()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(image.preview, '_blank');
    }
    setDownloading(false);
  };

  if (!user) {
    return (
      <Layout>
        <section className="auth-container">
          <div className="auth-card" style={{ textAlign: 'center' }}>
            <h1>Your Library</h1>
            <p className="muted">Sign in to view your purchased images.</p>
            <Link to="/auth" className="btn">Sign in</Link>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="hero slim">
        <div>
          <p className="eyebrow">Your library</p>
          <h1>Purchased Images</h1>
          <p className="lead">
            All images you have purchased are collected here for easy access and download.
          </p>
        </div>
        <div className="hero-actions">
          <Link className="ghost" to="/explore">Browse more images</Link>
          <Link className="pill" to="/buy-credits">Buy credits</Link>
        </div>
      </section>

      {loading ? (
        <p className="muted" style={{ textAlign: 'center', padding: 48 }}>Loading...</p>
      ) : images.length === 0 ? (
        <section className="section" style={{ textAlign: 'center' }}>
          <p className="muted">You haven't purchased any images yet.</p>
          <div className="hero-actions" style={{ justifyContent: 'center', marginTop: 16 }}>
            <Link className="btn" to="/explore">Explore the gallery</Link>
          </div>
        </section>
      ) : (
        <section className="explore-grid">
          {images.map((image, idx) => (
            <figure key={`${image.id}-${idx}`} className="explore-card">
              <button
                type="button"
                className="explore-image-btn"
                onClick={() => setLightbox(image)}
              >
                <img src={image.preview} alt={image.title} loading="lazy" />
                <div className="explore-overlay">
                  <span className="explore-overlay-title">{image.title}</span>
                  <span className="tag">Owned</span>
                </div>
              </button>
              <figcaption className="explore-caption">
                <div>
                  <p className="explore-img-title">{image.title}</p>
                  <p className="muted small">{image.collectionTitle}</p>
                </div>
                <button
                  className="ghost"
                  type="button"
                  onClick={() => handleDownload(image)}
                  title="Download image"
                >
                  Download
                </button>
              </figcaption>
            </figure>
          ))}
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
              <img src={lightbox.preview} alt={lightbox.title} />
            </div>
            <div className="lightbox-details">
              <div>
                <p className="eyebrow">{lightbox.collectionTitle}</p>
                <h3>{lightbox.title}</h3>
                <p className="muted small">Purchased</p>
              </div>
              <div className="lightbox-actions">
                <button
                  className="pill"
                  type="button"
                  onClick={() => handleDownload(lightbox)}
                  disabled={downloading}
                >
                  {downloading ? 'Downloading...' : 'Download'}
                </button>
                <button className="ghost" type="button" onClick={() => setLightbox(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default MyLibraryPage;
