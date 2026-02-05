import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../store/AuthContext';
import { usePurchasedImages } from '../hooks/useGallery';
import { useUnlockedCollections } from '../hooks/useAdminCollections';
import { supabase } from '../lib/supabase';

const MyLibraryPage = () => {
  const { user } = useAuth();
  const { images, loading } = usePurchasedImages();
  const { unlocked, loading: unlockedLoading, refetch: refetchUnlocked } = useUnlockedCollections();
  const [lightbox, setLightbox] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState(null);

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

  const handleRedeem = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setRedeeming(true);
    setRedeemMsg(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/redeem-code`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setRedeemMsg({ type: 'success', text: `Unlocked: ${data.collection}` });
        setCode('');
        await refetchUnlocked();
      } else {
        setRedeemMsg({ type: 'error', text: data.error || 'Invalid code' });
      }
    } catch {
      setRedeemMsg({ type: 'error', text: 'Something went wrong. Please try again.' });
    }
    setRedeeming(false);
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

      <section className="section alt">
        <div className="section-head">
          <div>
            <p className="eyebrow">Unlock code</p>
            <h2>Redeem a collection code</h2>
            <p className="muted">Enter a code from your photographer to unlock a private collection.</p>
          </div>
        </div>
        <form className="redeem-form" onSubmit={handleRedeem}>
          <input
            className="redeem-input"
            type="text"
            placeholder="Enter your code (e.g. CW-XXXXXXXX)"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            disabled={redeeming}
          />
          <button className="pill" type="submit" disabled={redeeming || !code.trim()}>
            {redeeming ? 'Redeeming...' : 'Redeem'}
          </button>
        </form>
        {redeemMsg && (
          <p className={`redeem-msg ${redeemMsg.type}`}>{redeemMsg.text}</p>
        )}
      </section>

      {unlocked.length > 0 && (
        <section className="section">
          <div className="section-head">
            <div>
              <p className="eyebrow">Unlocked collections</p>
              <h2>Your private galleries</h2>
              <p className="muted">Collections unlocked with a code from your photographer.</p>
            </div>
          </div>
          <div className="grid collections-grid">
            {unlocked.map((item) => {
              const c = item.admin_collections;
              if (!c) return null;
              return (
                <Link key={item.id} className="collection-card" to={`/unlocked/${c.id}`}>
                  {c.cover_url && (
                    <div className="collection-cover" style={{ backgroundImage: `url(${c.cover_url})` }} aria-hidden />
                  )}
                  <div className="collection-body">
                    <div className="tag">Unlocked</div>
                    <h3>{c.title}</h3>
                    <p className="muted">{c.description}</p>
                    {c.tags?.length > 0 && (
                      <div className="chips">
                        {c.tags.map((tag) => <span key={tag} className="chip">{tag}</span>)}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

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
                <button className="ghost" type="button" onClick={() => handleDownload(image)} title="Download image">
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
            <button className="icon-button close" type="button" onClick={() => setLightbox(null)}>✕</button>
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
                <button className="pill" type="button" onClick={() => handleDownload(lightbox)} disabled={downloading}>
                  {downloading ? 'Downloading...' : 'Download'}
                </button>
                <button className="ghost" type="button" onClick={() => setLightbox(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default MyLibraryPage;
