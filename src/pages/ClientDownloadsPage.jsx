import { Link } from 'react-router-dom';
import { useState } from 'react';
import Layout from '../components/Layout';
import { normalizedClientCollections } from '../utils/collections';

const ClientDownloadsPage = () => {
  const downloads = normalizedClientCollections.flatMap((collection) =>
    collection.imageObjects.map((image) => ({
      ...image,
      collectionTitle: collection.title,
      collectionId: collection.id,
      category: collection.category,
    })),
  );

  const [lightboxImage, setLightboxImage] = useState(null);
  const [expandedCards, setExpandedCards] = useState(() => new Set());

  const toggleExpanded = (id) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <Layout>
      <section className="hero slim">
        <p className="eyebrow">Client library</p>
        <h1>Ready-to-download photos</h1>
        <p className="lead">
          Access the images tied to your account. Jump back into the full gallery or download
          selects directly.
        </p>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Purchased</p>
            <h2>Included downloads</h2>
            <p className="muted">Curated highlights from your collections, ready to save.</p>
          </div>
          <Link className="ghost" to="/collections">
            Back to collections
          </Link>
        </div>

        <div className="download-grid">
          {downloads.map((image) => (
            <article key={image.id} className="download-card">
              <button
                type="button"
                className="thumb-media thumb-button"
                onClick={() => setLightboxImage(image)}
              >
                <img src={image.src} alt={image.title} />
              </button>
              <div className="download-body">
                <div className="download-header">
                  <div>
                    <div className="muted small">{image.collectionTitle}</div>
                    <h3>{image.title}</h3>
                    <p className="muted">{image.category}</p>
                  </div>
                  <button
                    className="toggle-actions"
                    type="button"
                    onClick={() => toggleExpanded(image.id)}
                    aria-expanded={expandedCards.has(image.id)}
                    aria-controls={`${image.id}-actions`}
                  >
                    {expandedCards.has(image.id) ? '▲' : '▼'}
                    <span className="sr-only">Toggle download options</span>
                  </button>
                </div>
                {expandedCards.has(image.id) && (
                  <div className="download-actions" id={`${image.id}-actions`}>
                    <button className="pill" type="button">
                      Download
                    </button>
                    <Link className="ghost" to={`/collections/${image.collectionId}`}>
                      View gallery
                    </Link>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>

        {lightboxImage && (
          <div className="lightbox" role="dialog" aria-modal="true">
            <div className="lightbox-content">
              <button className="lightbox-close" type="button" onClick={() => setLightboxImage(null)}>
                ×<span className="sr-only">Close</span>
              </button>
              <img src={lightboxImage.src} alt={lightboxImage.title} />
              <div className="muted small">
                {lightboxImage.collectionTitle} — {lightboxImage.title}
              </div>
            </div>
          </div>
        )}
      </section>
    </Layout>
  );
};

export default ClientDownloadsPage;
