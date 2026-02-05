import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../store/AuthContext';
import { usePurchasedImages } from '../hooks/useGallery';

const MyLibraryPage = () => {
  const { user } = useAuth();
  const { images, loading } = usePurchasedImages();

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
              <div className="explore-image-btn">
                <img src={image.preview} alt={image.title} loading="lazy" />
              </div>
              <figcaption className="explore-caption">
                <div>
                  <p className="explore-img-title">{image.title}</p>
                  <p className="muted small">{image.collectionTitle}</p>
                </div>
                <span className="tag">Owned</span>
              </figcaption>
            </figure>
          ))}
        </section>
      )}
    </Layout>
  );
};

export default MyLibraryPage;
