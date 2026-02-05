import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { normalizedClientCollections, normalizedCollections } from '../utils/collections';
import { useAuth } from '../store/AuthContext';
import { useThemes, useAllGalleryImages } from '../hooks/useGallery';
import { useAdminCollections } from '../hooks/useAdminCollections';
import { useStore } from '../store/StoreContext';

const CollectionsPage = () => {
  const { user } = useAuth();
  const { themes } = useThemes();
  const { images } = useAllGalleryImages();
  const { collections: adminCollections } = useAdminCollections();
  const { addToCart } = useStore();

  const sellingCollections = adminCollections.filter((c) => c.is_selling && c.is_published);
  const previewImages = images.slice(0, 8);

  const handleAdd = (image) => {
    addToCart({
      id: image.id,
      title: image.title,
      price: image.price,
      collectionTitle: image.themes?.name ?? 'Gallery',
      preview: image.url,
    });
  };

  return (
    <Layout>
      <section className="hero slim">
        <div>
          <p className="eyebrow">Full galleries</p>
          <h1>Browse curated image collections.</h1>
          <p className="lead">
            View full stories grouped by theme. Select a collection to open the gallery view,
            or explore all images below.
          </p>
          <div className="chips">
            <span className="chip">Bulk-ready themes</span>
            <span className="chip">Individual downloads</span>
          </div>
        </div>
      </section>

      {user && (
        <section className="section alt">
          <div className="section-head">
            <div>
              <p className="eyebrow">Your library</p>
              <h2>Client collections</h2>
              <p className="muted">Quickly revisit the galleries tied to your account.</p>
            </div>
            <div className="section-actions">
              <span className="tag">Signed in</span>
              <Link className="pill" to="/my-library">
                View your library
              </Link>
            </div>
          </div>
          <div className="grid collections-grid">
            {normalizedClientCollections.map((collection) => (
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
                      <span key={tag} className="chip">{tag}</span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Signature work</p>
            <h2>Full collections</h2>
            <p className="muted">
              Select a collection to reveal a gallery of related images.
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
                    <span key={tag} className="chip">{tag}</span>
                  ))}
                </div>
              </div>
            </Link>
          ))}

          {sellingCollections.map((c) => (
            <Link key={c.id} className="collection-card" to={`/collections/${c.slug}`}>
              {c.cover_url && (
                <div className="collection-cover" style={{ backgroundImage: `url(${c.cover_url})` }} aria-hidden />
              )}
              <div className="collection-body">
                <div className="tag">{c.category}</div>
                <h3>{c.title}</h3>
                <p className="muted">{c.description}</p>
                {c.bulk_bundle_label && (
                  <div className="bundle-note">
                    <span className="chip">Bulk eligible</span>
                    <span className="muted small">{c.bulk_bundle_label}</span>
                  </div>
                )}
                {c.tags?.length > 0 && (
                  <div className="chips">
                    {c.tags.map((tag) => (
                      <span key={tag} className="chip">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="section alt">
        <div className="section-head">
          <div>
            <p className="eyebrow">Explore by theme</p>
            <h2>Individual images</h2>
            <p className="muted">
              Browse individual images across all themes. Add any frame to your cart instantly.
            </p>
          </div>
          <Link className="ghost" to="/explore">
            View all images
          </Link>
        </div>

        {themes.length > 0 && (
          <div className="explore-theme-chips">
            {themes.map((theme) => (
              <Link key={theme.id} className="chip" to={`/explore?theme=${theme.slug}`}>
                {theme.name}
              </Link>
            ))}
          </div>
        )}

        <div className="explore-grid compact">
          {previewImages.map((image) => (
            <figure key={image.id} className="explore-card">
              <Link to={`/explore${image.themes?.slug ? `?theme=${image.themes.slug}` : ''}`} className="explore-image-btn">
                <img src={image.url} alt={image.title} loading="lazy" />
                <div className="explore-overlay">
                  <span className="explore-overlay-title">{image.title}</span>
                  <span className="tag">{image.price} credits</span>
                </div>
              </Link>
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
        </div>
      </section>
    </Layout>
  );
};

export default CollectionsPage;
