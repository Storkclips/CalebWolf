import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../store/AuthContext';
import { usePurchasedImages } from '../hooks/useGallery';
import { useUnlockedCollections } from '../hooks/useAdminCollections';
import { supabase, proxyImageUrl, getSignedDownloadUrl } from '../lib/supabase';
import GalleryLightbox from '../components/GalleryLightbox';
import ProtectedImage from '../components/ProtectedImage';

const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const VariantPickerModal = ({ image, variants, onClose, onDownload, downloading }) => (
  <div className="variant-backdrop" onClick={onClose}>
    <div className="variant-modal" onClick={(e) => e.stopPropagation()}>
      <div className="variant-modal-header">
        <div>
          <p className="variant-modal-eyebrow">Choose download format</p>
          <h3 className="variant-modal-title">{image.title}</h3>
        </div>
        <button type="button" className="variant-modal-close" onClick={onClose}><CloseIcon /></button>
      </div>
      <div className="variant-modal-list">
        {variants.map((v) => (
          <div key={v.id} className="variant-modal-row">
            <div className="variant-modal-row-info">
              <span className="variant-modal-row-label">{v.label}</span>
            </div>
            <button
              className="pill variant-modal-dl-btn"
              type="button"
              disabled={downloading}
              onClick={() => onDownload(v.url, image.title)}
            >
              <DownloadIcon /> {downloading ? 'Downloading…' : 'Download'}
            </button>
          </div>
        ))}
        <div className="variant-modal-row variant-modal-row--original">
          <div className="variant-modal-row-info">
            <span className="variant-modal-row-label">Original file</span>
            <span className="variant-modal-row-sub muted small">As uploaded by photographer</span>
          </div>
          <button
            className="ghost variant-modal-dl-btn"
            type="button"
            disabled={downloading}
            onClick={() => onDownload(image.preview, image.title)}
          >
            <DownloadIcon /> {downloading ? 'Downloading…' : 'Download'}
          </button>
        </div>
      </div>
    </div>
  </div>
);

const MyLibraryPage = () => {
  const { user } = useAuth();
  const { images, loading } = usePurchasedImages();
  const { unlocked, loading: unlockedLoading, refetch: refetchUnlocked } = useUnlockedCollections();
  const [lightbox, setLightbox] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [variantPicker, setVariantPicker] = useState(null);
  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState(null);
  const [activeTab, setActiveTab] = useState('images');

  const downloadFile = async (url, title) => {
    setDownloading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const signedUrl = token ? await getSignedDownloadUrl(url, token) : null;
      const fetchUrl = signedUrl ?? url;
      const response = await fetch(fetchUrl);
      const blob = await response.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      const ext = blob.type.split('/')[1] || 'jpg';
      a.download = `${title.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '-').toLowerCase()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objUrl);
    } catch {
      window.open(url, '_blank');
    }
    setDownloading(false);
  };

  const handleDownload = async (image) => {
    const { data: variants } = await supabase
      .from('image_variants')
      .select('*')
      .eq('image_id', image.id)
      .order('sort_order');

    if (variants && variants.length > 0) {
      setVariantPicker({ image, variants });
      return;
    }
    await downloadFile(image.preview, image.title);
  };

  const handleVariantDownload = async (url, title) => {
    await downloadFile(url, title);
    setVariantPicker(null);
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
                      <ProtectedImage
                        src={proxyImageUrl(image.preview, 600)}
                        alt={image.title}
                        fit="cover"
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                      />
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
                      <div className="lib-gallery-cover" style={{ backgroundImage: `url(${c.cover_url})` }} />
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
        <GalleryLightbox
          image={lightbox}
          imageUrlKey="preview"
          imageList={images}
          onClose={() => setLightbox(null)}
          onNavigate={(dir) => {
            const idx = images.findIndex((i) => i.id === lightbox.id);
            const next = idx + dir;
            if (next >= 0 && next < images.length) setLightbox(images[next]);
          }}
          meta={lightbox.collectionTitle}
          footer={
            <button className="pill" type="button" onClick={() => handleDownload(lightbox)} disabled={downloading}>
              {downloading ? 'Downloading…' : 'Download'}
            </button>
          }
        />
      )}
      {variantPicker && (
        <VariantPickerModal
          image={variantPicker.image}
          variants={variantPicker.variants}
          onClose={() => setVariantPicker(null)}
          onDownload={handleVariantDownload}
          downloading={downloading}
        />
      )}
    </Layout>
  );
};

export default MyLibraryPage;
