import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../store/AuthContext';
import { useStore } from '../store/StoreContext';
import { supabase } from '../lib/supabase';

const UnlockedGalleryPage = () => {
  const { collectionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart, cart } = useStore();
  const [collection, setCollection] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lightbox, setLightbox] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!user) { setLoading(false); return; }
      const { data: unlock } = await supabase
        .from('unlocked_collections')
        .select('id')
        .eq('user_id', user.id)
        .eq('collection_id', collectionId)
        .maybeSingle();

      if (!unlock) { navigate('/my-library'); return; }

      const { data: coll } = await supabase
        .from('admin_collections')
        .select('*')
        .eq('id', collectionId)
        .maybeSingle();

      const { data: imgs } = await supabase
        .from('collection_images')
        .select('*')
        .eq('collection_id', collectionId)
        .eq('is_published', true)
        .order('sort_order', { ascending: true });

      setCollection(coll);
      setImages(imgs ?? []);
      setLoading(false);
    };
    load();
  }, [collectionId, user, navigate]);

  if (!user) {
    return (
      <Layout>
        <section className="auth-container">
          <div className="auth-card" style={{ textAlign: 'center' }}>
            <h1>Sign in required</h1>
            <p className="muted">Please sign in to view this collection.</p>
            <Link to="/auth" className="btn">Sign in</Link>
          </div>
        </section>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="ss-loading"><div className="ss-spinner" /><p>Loading...</p></div>
      </Layout>
    );
  }

  if (!collection) return null;

  const filtered = images.filter((img) =>
    search ? img.title.toLowerCase().includes(search.toLowerCase()) : true
  );

  const handleAdd = (image) => {
    addToCart({
      id: image.id,
      title: image.title,
      price: image.price,
      collectionTitle: collection.title,
      preview: image.url,
    });
    setMessage('Added to cart');
    setTimeout(() => setMessage(''), 2400);
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
                <button className="ss-search-clear" type="button" onClick={() => setSearch('')}>✕</button>
              )}
            </div>
            <div className="ss-topbar-meta">
              <span className="ss-result-count">{filtered.length} image{filtered.length !== 1 ? 's' : ''}</span>
              <Link className="ss-active-theme-tag" to="/my-library">{collection.title}</Link>
            </div>
          </div>
        </div>

        <div className="ss-collection-hero">
          <div className="ss-collection-hero-inner">
            <p className="eyebrow">{collection.category}</p>
            <h1>{collection.title}</h1>
            <p className="lead">{collection.description}</p>
            {collection.tags?.length > 0 && (
              <div className="chips">
                {collection.tags.map((tag) => <span key={tag} className="chip">{tag}</span>)}
              </div>
            )}
            <div className="ss-collection-hero-actions">
              <Link className="ghost" to="/my-library">Back to library</Link>
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
                <button type="button" className="ss-card-img-btn" onClick={() => setLightbox(image)}>
                  <img src={image.url} alt={image.title} loading="lazy" />
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
                  <button className="ss-cart-btn" type="button" onClick={() => handleAdd(image)}>+ Cart</button>
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
            <button className="ss-lb-nav ss-lb-prev" type="button" onClick={() => navigateLightbox(-1)}
              disabled={filtered.findIndex((i) => i.id === lightbox.id) === 0}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <button className="ss-lb-nav ss-lb-next" type="button" onClick={() => navigateLightbox(1)}
              disabled={filtered.findIndex((i) => i.id === lightbox.id) === filtered.length - 1}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M9 18l6-6-6-6" /></svg>
            </button>
            <div className="ss-lb-media"><img src={lightbox.url} alt={lightbox.title} /></div>
            <div className="ss-lb-footer">
              <div className="ss-lb-info">
                <p className="ss-lb-title">{lightbox.title}</p>
                <p className="ss-lb-meta">{collection.title} &middot; {lightbox.price} credits</p>
              </div>
              <div className="ss-lb-actions">
                <button className="pill" type="button" onClick={() => { handleAdd(lightbox); setLightbox(null); }}>Add to cart</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {message && <div className="toast" role="status">{message}</div>}
    </Layout>
  );
};

export default UnlockedGalleryPage;
