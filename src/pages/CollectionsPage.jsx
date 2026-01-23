import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { normalizedClientCollections, normalizedCollections } from '../utils/collections';

const CollectionsPage = () => {
  const [isClientLoggedIn] = useState(true);
  const totalClientCollections = normalizedClientCollections.length;
  const totalPublicCollections = normalizedCollections.length;
  const totalImages = [...normalizedClientCollections, ...normalizedCollections].reduce(
    (sum, collection) => sum + collection.imageObjects.length,
    0,
  );

  return (
    <Layout>
      <section className="hero slim collections-hero">
        <div className="collections-hero-content">
          <p className="eyebrow">Full galleries</p>
          <h1>Browse curated image collections.</h1>
          <p className="lead">
            View full stories grouped by theme. Clients see their paid collections first, then
            can continue into the public showcase. Select a collection to open the gallery view
            without an embedded preview.
          </p>
          <div className="chips">
            <span className="chip">Bulk-ready themes</span>
            <span className="chip">Client-first browsing</span>
            <span className="chip">Instant checkout</span>
          </div>
        </div>
        <aside className="collections-hero-panel">
          <div className="panel-header">
            <p className="eyebrow">At a glance</p>
            <h2>Gallery overview</h2>
            <p className="muted small">Updated weekly with client-ready stories.</p>
          </div>
          <div className="panel-stats">
            <div>
              <div className="stat-value">{totalImages}</div>
              <p className="muted small">Images available</p>
            </div>
            <div>
              <div className="stat-value">{totalClientCollections}</div>
              <p className="muted small">Client collections</p>
            </div>
            <div>
              <div className="stat-value">{totalPublicCollections}</div>
              <p className="muted small">Public collections</p>
            </div>
          </div>
          <div className="panel-actions">
            <Link className="pill" to="/client-downloads">
              Jump to downloads
            </Link>
            <Link className="ghost" to="/contact">
              Request custom gallery
            </Link>
          </div>
        </aside>
      </section>

      {isClientLoggedIn && (
        <section className="section alt collections-section">
          <div className="section-head collections-head">
            <div>
              <p className="eyebrow">Your library</p>
              <h2>Client collections</h2>
              <p className="muted">Quickly revisit the galleries tied to your account.</p>
            </div>
            <div className="section-actions">
              <span className="tag">Signed in</span>
              <Link className="pill" to="/client-downloads">
                View ready downloads
              </Link>
            </div>
          </div>
          <div className="grid collections-grid">
            {normalizedClientCollections.map((collection) => (
              <Link
                key={collection.id}
                className="collection-card featured"
                to={`/collections/${collection.id}`}
              >
                <div
                  className="collection-cover"
                  style={{ backgroundImage: `url(${collection.cover})` }}
                  aria-hidden
                />
                <div className="collection-body">
                  <div className="tag">Paid collection</div>
                  <h3>{collection.title}</h3>
                  <p className="muted">{collection.description}</p>
                  {collection.bulkBundle && (
                    <div className="bundle-note">
                      <span className="chip">Bulk download ready</span>
                      <span className="muted small">{collection.bulkBundle.label}</span>
                    </div>
                  )}
                  <div className="chips">
                    {collection.tags.map((tag) => (
                      <span key={tag} className="chip">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="section collections-section">
        <div className="section-head collections-head">
          <div>
            <p className="eyebrow">Signature work</p>
            <h2>Explore by theme</h2>
            <p className="muted">
              Select a collection to reveal a gallery of related images. Admins can flag themes
              for bulk pricing, making it easy to purchase entire galleries in one go.
            </p>
          </div>
          <Link className="ghost" to="/contact">
            Request a private gallery
          </Link>
        </div>

        <div className="grid collections-grid">
          {normalizedCollections.map((collection) => (
            <Link
              key={collection.id}
              className="collection-card"
              to={`/collections/${collection.id}`}
            >
              <div
                className="collection-cover"
                style={{ backgroundImage: `url(${collection.cover})` }}
                aria-hidden
              />
              <div className="collection-body">
                <div className="tag">{collection.category}</div>
                <h3>{collection.title}</h3>
                <p className="muted">{collection.description}</p>
                {collection.bulkBundle && (
                  <div className="bundle-note">
                    <span className="chip">Bulk eligible</span>
                    <span className="muted small">{collection.bulkBundle.summary}</span>
                  </div>
                )}
                <div className="chips">
                  {collection.tags.map((tag) => (
                    <span key={tag} className="chip">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </Layout>
  );
};

export default CollectionsPage;
