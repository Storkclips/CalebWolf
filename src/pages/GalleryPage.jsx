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
  const [heroIndex, setHeroIndex] = useState(0);
  const [activeModalImage, setActiveModalImage] = useState(null);

  const allCollections = [...normalizedClientCollections, ...normalizedCollections];
  const collection = allCollections.find((item) => item.id === collectionId);
  const heroImages = collection?.imageObjects ?? [];
  const curatedImages = (collection?.imageObjects ?? []).map((image, index) => ({
    ...image,
    id: `${collection?.id ?? 'test'}-test-${index + 1}`,
    title: image.title || `Test image ${index + 1}`,
  }));

  useEffect(() => {
    if (!collection) {
      navigate('/collections');
    }
  }, [collection, navigate]);

  useEffect(() => {
    setHeroIndex(0);
  }, [collectionId]);

  useEffect(() => {
    if (!message) return undefined;

    const timer = setTimeout(() => setMessage(''), 2600);
    return () => clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (!heroImages.length) return undefined;

    const timer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroImages.length);
    }, 3800);

    return () => clearInterval(timer);
  }, [heroImages.length]);

  const handleSlideChange = (delta) => {
    if (!heroImages.length) return;
    setHeroIndex((prev) => (prev + delta + heroImages.length) % heroImages.length);
  };

  if (!collection) {
    return null;
  }

  const handleAdd = (image) => {
    addToCart({
      id: image.id,
      title: image.title,
      price: image.price,
      collectionTitle: collection.title,
      preview: image.src,
    });
    setMessage('Added Item To Cart');
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
    setMessage('Added Item To Cart');
  };

  return (
    <Layout>
      <section className="hero slim gallery">
        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">{collection.category}</p>
            <h1>{collection.title}</h1>
            <p className="lead">{collection.description}</p>
            <div className="chips">
              {collection.tags.map((tag) => (
                <span key={tag} className="chip">
                  {tag}
                </span>
              ))}
            </div>
            <div className="hero-actions">
              <Link className="ghost" to="/collections">
                Back to collections
              </Link>
              <Link className="pill" to="/cart">
                View cart ({cart.length})
              </Link>
            </div>
          </div>
          <div className="hero-media">
            <div className="hero-carousel">
              <button
                className="icon-button"
                type="button"
                onClick={() => handleSlideChange(-1)}
                aria-label="Previous image"
              >
                ←
              </button>
              <div className="hero-carousel-frame">
                {heroImages.length > 0 && (
                  <img src={heroImages[heroIndex].src} alt={heroImages[heroIndex].title} />
                )}
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={() => handleSlideChange(1)}
                aria-label="Next image"
              >
                →
              </button>
            </div>
            <p className="muted small">Credits available: {creditBalance}</p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Available images</p>
            <h2>Purchase individual frames</h2>
            <p className="muted">
              Select single images or add the full bundle. Each image is delivered in high-res
              with share-ready crops.
            </p>
          </div>
          {collection.bulkBundle && (
            <button className="pill" type="button" onClick={handleAddBundle}>
              Add bundle ({collection.bulkBundle.price} credits)
            </button>
          )}
        </div>
        <div className="grid gallery-grid">
          {curatedImages.map((image) => (
            <figure key={image.id} className="gallery-card">
              <button
                type="button"
                className="gallery-image"
                onClick={() => setActiveModalImage(image)}
              >
                <img src={image.src} alt={image.title} />
              </button>
              <figcaption>
                <div>
                  <p className="muted small">{image.title}</p>
                  <p className="tag">{image.price} credits</p>
                </div>
                <button className="ghost" type="button" onClick={() => handleAdd(image)}>
                  <span aria-hidden>🛒 +</span>
                  <span className="sr-only">Add to cart</span>
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
        {message && (
          <div className="toast" role="status">
            {message}
          </div>
        )}
        {activeModalImage && (
          <div className="lightbox overlay" role="dialog" aria-modal="true">
            <div className="lightbox-panel">
              <button
                className="icon-button close"
                type="button"
                onClick={() => setActiveModalImage(null)}
                aria-label="Close image preview"
              >
                ✕
              </button>
              <div className="lightbox-media">
                <img src={activeModalImage.src} alt={activeModalImage.title} />
              </div>
              <div className="lightbox-details">
                <div>
                  <p className="eyebrow">{collection.title}</p>
                  <h3>{activeModalImage.title}</h3>
                  <p className="muted small">{activeModalImage.price} credits</p>
                </div>
                <div className="lightbox-actions">
                  <button className="pill" type="button" onClick={() => handleAdd(activeModalImage)}>
                    Add to cart
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </Layout>
  );
};

export default GalleryPage;
