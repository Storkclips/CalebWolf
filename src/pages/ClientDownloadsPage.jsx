import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../store/AuthContext';
import { supabase, proxyImageUrl, getSignedDownloadUrl } from '../lib/supabase';

// ── Icons ─────────────────────────────────────────────────────────────────────
const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const ChevronIcon = ({ open }) => (
  <svg
    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms ease' }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ── Variant picker modal ──────────────────────────────────────────────────────
const VariantPickerModal = ({ image, variants, onClose, onDownload, downloading }) => {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
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
};

// ── Download card ─────────────────────────────────────────────────────────────
const DownloadCard = ({ image, onDownload, onPreview, downloading }) => {
  const [open, setOpen] = useState(false);

  return (
    <article className="download-card">
      <button
        type="button"
        className="thumb-media thumb-button"
        onClick={() => onPreview(image)}
        aria-label={`Preview ${image.title}`}
      >
        <img
          src={proxyImageUrl(image.preview, 600)}
          alt={image.title}
          loading="lazy"
        />
      </button>
      <div className="download-body">
        <div className="download-header">
          <div className="download-header-text">
            {image.collectionTitle && (
              <div className="muted small">{image.collectionTitle}</div>
            )}
            <h3 className="download-card-title">{image.title}</h3>
          </div>
          <button
            className="toggle-actions"
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            <ChevronIcon open={open} />
            <span className="sr-only">Toggle download options</span>
          </button>
        </div>
        {open && (
          <div className="download-actions">
            <button
              className="pill"
              type="button"
              disabled={downloading}
              onClick={() => onDownload(image)}
            >
              <DownloadIcon />
              {downloading ? 'Downloading…' : 'Download'}
            </button>
            {image.collectionSlug && (
              <Link className="ghost" to={`/gallery/${image.collectionSlug}`}>
                View gallery
              </Link>
            )}
          </div>
        )}
      </div>
    </article>
  );
};

// ── Lightbox ──────────────────────────────────────────────────────────────────
const Lightbox = ({ image, onClose, onDownload, downloading }) => {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        <button className="lightbox-close" type="button" onClick={onClose}>
          <CloseIcon /><span className="sr-only">Close</span>
        </button>
        <img src={proxyImageUrl(image.preview, 1400)} alt={image.title} />
        <div className="lightbox-footer">
          <span className="muted small">
            {image.collectionTitle ? `${image.collectionTitle} — ` : ''}{image.title}
          </span>
          <button
            className="pill"
            type="button"
            disabled={downloading}
            onClick={() => onDownload(image)}
          >
            <DownloadIcon /> {downloading ? 'Downloading…' : 'Download'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────
const ClientDownloadsPage = () => {
  const { user } = useAuth();
  const [downloads, setDownloads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);
  const [variantPicker, setVariantPicker] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadAll();
  }, [user]);

  const loadAll = async () => {
    setLoading(true);
    const results = [];

    // 1. Individually purchased images from the purchases table
    const { data: purchases } = await supabase
      .from('purchases')
      .select('items');
    if (purchases) {
      for (const row of purchases) {
        for (const item of (row.items ?? [])) {
          results.push({
            id: item.id,
            title: item.title ?? 'Untitled',
            preview: item.preview,
            collectionTitle: item.collectionTitle ?? null,
            collectionSlug: null,
            source: 'purchase',
          });
        }
      }
    }

    // 2. Images from unlocked private collections (gift codes)
    const { data: unlocked } = await supabase
      .from('user_collection_access')
      .select('collection_id, admin_collections(id, title, slug, collection_images(id, url, webp_url, title))')
      .eq('user_id', user.id);
    if (unlocked) {
      for (const row of unlocked) {
        const col = row.admin_collections;
        if (!col) continue;
        for (const img of (col.collection_images ?? [])) {
          results.push({
            id: img.id,
            title: img.title ?? col.title,
            preview: img.url,
            webp_url: img.webp_url ?? null,
            collectionTitle: col.title,
            collectionSlug: col.slug,
            source: 'collection',
          });
        }
      }
    }

    setDownloads(results);
    setLoading(false);
  };

  const downloadFile = useCallback(async (url, title) => {
    setDownloading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const signedUrl = token ? await getSignedDownloadUrl(url, token) : null;
      const fetchUrl = signedUrl ?? url;
      const response = await fetch(fetchUrl);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      const ext = blob.type.split('/')[1] || 'jpg';
      a.download = `${(title ?? 'photo').replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '-').toLowerCase()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objUrl);
    } catch {
      window.open(url, '_blank');
    }
    setDownloading(false);
  }, []);

  const handleDownload = useCallback(async (image) => {
    const { data: variants } = await supabase
      .from('image_variants')
      .select('*')
      .eq('image_id', image.id)
      .order('sort_order');

    if (variants && variants.length > 0) {
      setVariantPicker({ image, variants });
      setLightbox(null);
      return;
    }
    await downloadFile(image.preview, image.title);
  }, [downloadFile]);

  const handleVariantDownload = useCallback(async (url, title) => {
    await downloadFile(url, title);
    setVariantPicker(null);
  }, [downloadFile]);

  if (!user) {
    return (
      <Layout>
        <section className="hero slim">
          <p className="eyebrow">Client library</p>
          <h1>Your downloads</h1>
        </section>
        <section className="section" style={{ textAlign: 'center', paddingTop: 60 }}>
          <p className="muted" style={{ marginBottom: 24 }}>Sign in to access your purchased images and unlocked galleries.</p>
          <Link className="pill" to="/auth">Sign in</Link>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="hero slim">
        <p className="eyebrow">Client library</p>
        <h1>Your downloads</h1>
        <p className="lead">
          All images tied to your account — purchased selects and unlocked private galleries.
        </p>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Owned</p>
            <h2>
              {loading ? 'Loading…' : `${downloads.length} image${downloads.length !== 1 ? 's' : ''}`}
            </h2>
            <p className="muted">Click any card to expand download options.</p>
          </div>
          <Link className="ghost" to="/collections">Browse collections</Link>
        </div>

        {loading ? (
          <div className="cdl-loading">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="download-card skeleton-card" />
            ))}
          </div>
        ) : downloads.length === 0 ? (
          <div className="cdl-empty">
            <p className="muted" style={{ marginBottom: 20 }}>
              You don't have any downloads yet. Browse the gallery to purchase images or redeem a gift code.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <Link className="pill" to="/gallery">Browse gallery</Link>
              <Link className="ghost" to="/my-library">My Library</Link>
            </div>
          </div>
        ) : (
          <div className="download-grid">
            {downloads.map((image) => (
              <DownloadCard
                key={`${image.source}-${image.id}`}
                image={image}
                onDownload={handleDownload}
                onPreview={setLightbox}
                downloading={downloading}
              />
            ))}
          </div>
        )}
      </section>

      {lightbox && (
        <Lightbox
          image={lightbox}
          onClose={() => setLightbox(null)}
          onDownload={handleDownload}
          downloading={downloading}
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

export default ClientDownloadsPage;
