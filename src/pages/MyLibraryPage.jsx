import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../store/AuthContext';
import { usePurchasedImages } from '../hooks/useGallery';
import { useUnlockedCollections } from '../hooks/useAdminCollections';
import { supabase, proxyImageUrl, getSignedDownloadUrl } from '../lib/supabase';

const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const MyLibraryPage = () => {
  const { user } = useAuth();
  const { images, loading } = usePurchasedImages();
  const { unlocked, loading: unlockedLoading, refetch: refetchUnlocked } = useUnlockedCollections();
  const [lightbox, setLightbox] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState(null);
  const [activeTab, setActiveTab] = useState('images');

  const handleDownload = async (image) => {
    setDownloading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const signedUrl = token ? await getSignedDownloadUrl(image.preview, token) : null;
      const fetchUrl = signedUrl ?? image.preview;
      const response = await fetch(fetchUrl);
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
      const { data, error } = await supabase.functions.invoke('redeem-code', {
        body: { code: code.trim() },
      });
      if (error) {
        setRedeemMsg({ type: 'error', text: data?.error || error.message || 'Invalid code' });
      } else if (data.success) {
        setRedeemMsg({ type: 'success', text: `Unlocked: ${data.collection}` });
        setCode('');
        await refetchUnlocked();
        setActiveTab('galleries');
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
        <div className="lib-empty-state lib-empty-state--page">
          <div className="lib-empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
          <h2>Your Library</h2>
          <p className="muted">Sign in to view your purchased images and unlocked galleries.</p>
          <Link to="/login" className="btn" style={{ marginTop: 24 }}>Sign in</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="lib-header">
        <div className="lib-header-inner">
          <div className="lib-header-text">
            <p className="eyebrow">Your account</p>
            <h1>My Library</h1>
            <p className="muted">Your purchased images and unlocked private galleries.</p>
          </div>
          <div className="lib-stats">
            <div className="lib-stat">
              <span className="lib-stat-value">{images.length}</span>
              <span className="lib-stat-label">Images owned</span>
            </div>
            <div className="lib-stat">
              <span className="lib-stat-value">{unlocked.length}</span>
              <span className="lib-stat-label">Galleries</span>
            </div>
          </div>
        </div>

        <div className="lib-tabs">
          {[
            { id: 'images', label: 'Purchased Images', count: images.length },
            { id: 'galleries', label: 'Private Galleries', count: unlocked.length },
            { id: 'redeem', label: 'Redeem Code', count: null },
          ].map(({ id, label, count }) => (
            <button
              key={id}
              type="button"
              className={`lib-tab${activeTab === id ? ' active' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              {label}
              {count !== null && count > 0 && <span className="lib-tab-badge">{count}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Purchased Images */}
      {activeTab === 'images' && (
        <div className="lib-body">
          {loading ? (
            <div className="lib-loading">
              <div className="adm-users-loading-spinner" />
              <p className="muted">Loading…</p>
            </div>
          ) : images.length === 0 ? (
            <div className="lib-empty-state">
              <div className="lib-empty-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              <h3>No images yet</h3>
              <p className="muted">Purchase images from the gallery to find them here.</p>
              <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link className="btn" to="/explore">Explore images</Link>
                <Link className="ghost" to="/buy-credits">Buy credits</Link>
              </div>
            </div>
          ) : (
            <>
              <div className="lib-images-grid">
                {images.map((image, idx) => (
                  <div key={`${image.id}-${idx}`} className="lib-image-card">
                    <button
                      type="button"
                      className="lib-image-thumb"
                      onClick={() => setLightbox(image)}
                    >
                      <div className="protected-img" style={{ position: 'absolute', inset: 0 }} onContextMenu={(e) => e.preventDefault()}>
                        <img src={proxyImageUrl(image.preview, 600)} alt={image.title} loading="lazy" />
                      </div>
                      <div className="lib-image-zoom">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                          <line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
                        </svg>
                      </div>
                      <span className="lib-owned-badge">Owned</span>
                    </button>
                    <div className="lib-image-info">
                      <div className="lib-image-meta">
                        <p className="lib-image-title">{image.title}</p>
                        <p className="muted small">{image.collectionTitle}</p>
                      </div>
                      <button className="lib-dl-btn" type="button" onClick={() => handleDownload(image)}>
                        <DownloadIcon /> Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="lib-footer-actions">
                <Link className="ghost" to="/explore">Browse more images</Link>
                <Link className="pill" to="/buy-credits">Buy credits</Link>
              </div>
            </>
          )}
        </div>
      )}

      {/* Private Galleries */}
      {activeTab === 'galleries' && (
        <div className="lib-body">
          {unlockedLoading ? (
            <div className="lib-loading">
              <div className="adm-users-loading-spinner" />
              <p className="muted">Loading…</p>
            </div>
          ) : unlocked.length === 0 ? (
            <div className="lib-empty-state">
              <div className="lib-empty-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3>No private galleries yet</h3>
              <p className="muted">Redeem a code from your photographer to unlock a private gallery.</p>
              <button className="btn" style={{ marginTop: 20 }} onClick={() => setActiveTab('redeem')}>
                Redeem a code
              </button>
            </div>
          ) : (
            <div className="lib-galleries-grid">
              {unlocked.map((item) => {
                const c = item.admin_collections;
                if (!c) return null;
                return (
                  <Link key={item.id} className="lib-gallery-card" to={`/unlocked/${c.id}`}>
                    {c.cover_url ? (
                        <div
                          className="lib-gallery-cover"
                          style={{ backgroundImage: `url(${proxyImageUrl(c.cover_url, 800)})` }}
                        />                    
                  ) : (
                      <div className="lib-gallery-cover lib-gallery-cover--empty">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="lib-gallery-body">
                      <span className="lib-gallery-badge">Unlocked</span>
                      <h3 className="lib-gallery-title">{c.title}</h3>
                      {c.description && <p className="muted small">{c.description}</p>}
                      {c.tags?.length > 0 && (
                        <div className="chips" style={{ marginTop: 8 }}>
                          {c.tags.map((tag) => <span key={tag} className="chip">{tag}</span>)}
                        </div>
                      )}
                      <span className="lib-gallery-cta">Open gallery →</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Redeem Code */}
      {activeTab === 'redeem' && (
        <div className="lib-body">
          <div className="lib-redeem-wrap">
            <div className="lib-redeem-card">
              <div className="lib-redeem-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" />
                  <line x1="12" y1="22" x2="12" y2="7" />
                  <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                  <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                </svg>
              </div>
              <h2>Redeem a collection code</h2>
              <p className="muted">Your photographer will give you a unique code to unlock your private gallery.</p>
              <form className="lib-redeem-form" onSubmit={handleRedeem}>
                <input
                  className="lib-redeem-input"
                  type="text"
                  placeholder="e.g. CW-XXXXXXXX"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  disabled={redeeming}
                  autoFocus
                />
                <button className="btn" type="submit" disabled={redeeming || !code.trim()}>
                  {redeeming ? 'Redeeming…' : 'Unlock gallery'}
                </button>
              </form>
              {redeemMsg && (
                <div className={`lib-redeem-msg ${redeemMsg.type}`}>
                  {redeemMsg.text}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="lightbox overlay" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) setLightbox(null); }}>
          <div className="lightbox-panel">
            <button className="icon-button close" type="button" onClick={() => setLightbox(null)}>✕</button>
            <div className="lightbox-media protected-img" onContextMenu={(e) => e.preventDefault()}>
              <img src={proxyImageUrl(lightbox.preview, 1400)} alt={lightbox.title} />
            </div>
            <div className="lightbox-details">
              <div>
                <p className="eyebrow">{lightbox.collectionTitle}</p>
                <h3>{lightbox.title}</h3>
                <p className="muted small">Purchased</p>
              </div>
              <div className="lightbox-actions">
                <button className="pill" type="button" onClick={() => handleDownload(lightbox)} disabled={downloading}>
                  {downloading ? 'Downloading…' : 'Download'}
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
