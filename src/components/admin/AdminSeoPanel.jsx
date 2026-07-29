import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

const AdminSeoPanel = () => {
  const [id, setId] = useState(null);
  const [fields, setFields] = useState({
    site_title: 'Caleb Wolf Photography',
    meta_description: 'Cinematic photography portfolio, pricing, and blog by Caleb Wolf.',
    meta_keywords: '',
    og_title: '',
    og_description: '',
    og_image_url: '',
    twitter_card_type: 'summary_large_image',
    canonical_base_url: '',
    robots_index: true,
    robots_follow: true,
    json_ld: '',
    favicon_url: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [msg, setMsg] = useState(null);
  const faviconInputRef = useRef(null);

  useEffect(() => {
    supabase.from('seo_settings').select('*').maybeSingle().then(({ data }) => {
      if (data) {
        setId(data.id);
        setFields({
          site_title: data.site_title || '',
          meta_description: data.meta_description || '',
          meta_keywords: data.meta_keywords || '',
          og_title: data.og_title || '',
          og_description: data.og_description || '',
          og_image_url: data.og_image_url || '',
          twitter_card_type: data.twitter_card_type || 'summary_large_image',
          canonical_base_url: data.canonical_base_url || '',
          robots_index: data.robots_index ?? true,
          robots_follow: data.robots_follow ?? true,
          json_ld: data.json_ld || '',
          favicon_url: data.favicon_url || '',
        });
      }
      setLoading(false);
    });
  }, []);

  const set = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFields((f) => ({ ...f, [field]: value }));
  };

  const handleFaviconUpload = async (file) => {
    if (!file) return;
    setUploadingFavicon(true);
    setMsg(null);
    try {
      const ext = file.name.split('.').pop().toLowerCase();
      const fileName = `favicon-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('favicons')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });
      if (upErr) throw upErr;
      const { data: pubData } = supabase.storage.from('favicons').getPublicUrl(fileName);
      const publicUrl = pubData.publicUrl;
      const { error: dbErr } = await supabase
        .from('seo_settings')
        .update({ favicon_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (dbErr) throw dbErr;
      setFields((f) => ({ ...f, favicon_url: publicUrl }));
      setMsg({ type: 'success', text: 'Favicon updated.' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Failed to upload favicon' });
    }
    setUploadingFavicon(false);
    setTimeout(() => setMsg(null), 4000);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const { error } = await supabase
      .from('seo_settings')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id);
    setMsg(error ? { type: 'error', text: error.message } : { type: 'success', text: 'SEO settings saved.' });
    setSaving(false);
    setTimeout(() => setMsg(null), 4000);
  };

  if (loading) return <div className="adm-users-loading"><div className="adm-users-loading-spinner" /><p className="muted">Loading…</p></div>;

  // Google preview values
  const previewTitle = fields.og_title || fields.site_title || 'Caleb Wolf Photography';
  const previewDesc = fields.og_description || fields.meta_description || '';
  const previewUrl = fields.canonical_base_url
    ? fields.canonical_base_url.replace(/^https?:\/\//, '').replace(/\/$/, '')
    : 'your-site.com';
  const titleLen = previewTitle.length;
  const descLen = previewDesc.length;

  return (
    <div className="adm-panel">
      <div className="adm-panel-header">
        <div>
          <p className="eyebrow">Search Visibility</p>
          <h2>SEO</h2>
          <p className="muted">Control how your site appears in search engines and social media.</p>
        </div>
      </div>

      {/* ── Google Search Preview ── */}
      <div className="adm-settings-section">
        <h3 className="adm-settings-section-title">Google Search Preview</h3>
        <p className="muted small" style={{ marginBottom: 16 }}>
          This is approximately how your site will appear in Google search results.
        </p>
        <div style={{
          maxWidth: 600,
          padding: '20px 24px',
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #dfe1e5',
          boxShadow: '0 1px 6px rgba(32,33,36,0.28)',
          fontFamily: 'arial, sans-serif',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: '#f1f3f4', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, color: '#5f6368', flexShrink: 0,
            }}>
              {fields.favicon_url ? (
                <img src={fields.favicon_url} alt="" style={{ width: 16, height: 16, borderRadius: 2 }} />
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#4285f4"><circle cx="12" cy="12" r="10" /></svg>
              )}
            </div>
            <div>
              <div style={{ fontSize: 14, color: '#202124', lineHeight: 1.3 }}>{previewUrl}</div>
              <div style={{ fontSize: 12, color: '#5f6368' }}>{previewUrl}</div>
            </div>
          </div>
          <div style={{
            fontSize: 20, lineHeight: 1.3, color: '#1a0dab',
            cursor: 'pointer', marginBottom: 4,
            overflow: 'hidden', textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {previewTitle}
          </div>
          <div style={{
            fontSize: 14, lineHeight: 1.58, color: '#4d5156',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {previewDesc || 'No description set — add one below.'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12 }}>
          <span style={{ color: titleLen > 60 ? '#e53e3e' : '#4a5568' }}>
            Title: {titleLen} chars {titleLen > 60 && '(too long — Google may truncate)'}
          </span>
          <span style={{ color: descLen > 160 ? '#e53e3e' : '#4a5568' }}>
            Description: {descLen} chars {descLen > 160 && '(too long — Google may truncate)'}
          </span>
        </div>
      </div>

      {/* ── Favicon ── */}
      <div className="adm-settings-section" style={{ marginTop: 40 }}>
        <h3 className="adm-settings-section-title">Favicon</h3>
        <p className="muted small" style={{ marginBottom: 16 }}>
          The small icon shown in browser tabs and search results. Upload a PNG, ICO, or SVG file (recommended 32×32 or larger).
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 8, border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--card)', flexShrink: 0,
          }}>
            {fields.favicon_url ? (
              <img src={fields.favicon_url} alt="Favicon" style={{ width: 32, height: 32, borderRadius: 4 }} />
            ) : (
              <span className="muted small">None</span>
            )}
          </div>
          <input
            ref={faviconInputRef}
            type="file"
            accept=".png,.ico,.svg,.jpg,.jpeg,.webp,image/png,image/x-icon,image/svg+xml"
            style={{ display: 'none' }}
            onChange={(e) => handleFaviconUpload(e.target.files?.[0])}
          />
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => faviconInputRef.current?.click()}
            disabled={uploadingFavicon}
          >
            {uploadingFavicon ? 'Uploading…' : 'Upload Favicon'}
          </button>
          {fields.favicon_url && (
            <button
              type="button"
              className="ghost btn-sm"
              onClick={async () => {
                const { error } = await supabase
                  .from('seo_settings')
                  .update({ favicon_url: '', updated_at: new Date().toISOString() })
                  .eq('id', id);
                if (!error) setFields((f) => ({ ...f, favicon_url: '' }));
              }}
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {/* ── SEO Form ── */}
      <form onSubmit={handleSave}>
        <div className="adm-settings-section" style={{ marginTop: 40 }}>
          <h3 className="adm-settings-section-title">Basic Meta Tags</h3>
          <div className="adm-settings-form" style={{ marginTop: 16 }}>
            <label className="adm-settings-label">
              Site Title (page &lt;title&gt;)
              <input type="text" value={fields.site_title} onChange={set('site_title')} placeholder="Caleb Wolf Photography" disabled={saving} />
            </label>
            <label className="adm-settings-label">
              Meta Description
              <textarea value={fields.meta_description} onChange={set('meta_description')} rows={3} placeholder="A brief description of your site for search engines" disabled={saving} style={{ resize: 'vertical' }} />
            </label>
            <label className="adm-settings-label">
              Meta Keywords (comma-separated)
              <input type="text" value={fields.meta_keywords} onChange={set('meta_keywords')} placeholder="photography, portfolio, landscape" disabled={saving} />
            </label>
          </div>
        </div>

        <div className="adm-settings-section" style={{ marginTop: 32 }}>
          <h3 className="adm-settings-section-title">Open Graph &amp; Social Sharing</h3>
          <p className="muted small" style={{ marginBottom: 16 }}>
            Controls how your site looks when shared on Facebook, Twitter, LinkedIn, etc.
          </p>
          <div className="adm-settings-form">
            <label className="adm-settings-label">
              OG Title (leave blank to use site title)
              <input type="text" value={fields.og_title} onChange={set('og_title')} placeholder="Caleb Wolf Photography" disabled={saving} />
            </label>
            <label className="adm-settings-label">
              OG Description (leave blank to use meta description)
              <textarea value={fields.og_description} onChange={set('og_description')} rows={2} placeholder="Description for social shares" disabled={saving} style={{ resize: 'vertical' }} />
            </label>
            <label className="adm-settings-label">
              OG Image URL
              <input type="url" value={fields.og_image_url} onChange={set('og_image_url')} placeholder="https://your-site.com/og-image.jpg" disabled={saving} />
            </label>
            <label className="adm-settings-label">
              Twitter Card Type
              <select value={fields.twitter_card_type} onChange={set('twitter_card_type')} disabled={saving}>
                <option value="summary">Summary (small square)</option>
                <option value="summary_large_image">Summary with Large Image</option>
              </select>
            </label>
          </div>
        </div>

        <div className="adm-settings-section" style={{ marginTop: 32 }}>
          <h3 className="adm-settings-section-title">Advanced</h3>
          <div className="adm-settings-form">
            <label className="adm-settings-label">
              Canonical Base URL (e.g. https://your-site.com)
              <input type="url" value={fields.canonical_base_url} onChange={set('canonical_base_url')} placeholder="https://your-site.com" disabled={saving} />
            </label>
            <div style={{ display: 'flex', gap: 24, marginTop: 12 }}>
              <label className="adm-settings-label brand-toggle-row">
                <span>Allow search engines to index</span>
                <input type="checkbox" checked={fields.robots_index} onChange={set('robots_index')} disabled={saving} />
              </label>
              <label className="adm-settings-label brand-toggle-row">
                <span>Allow search engines to follow links</span>
                <input type="checkbox" checked={fields.robots_follow} onChange={set('robots_follow')} disabled={saving} />
              </label>
            </div>
            <label className="adm-settings-label" style={{ marginTop: 12 }}>
              JSON-LD Structured Data (optional)
              <textarea value={fields.json_ld} onChange={set('json_ld')} rows={5} placeholder={'{"@context":"https://schema.org","@type":"Person","name":"Caleb Wolf"}'} disabled={saving} style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 13 }} />
            </label>
          </div>
        </div>

        {msg && (
          <div className={msg.type === 'success' ? 'notice' : 'auth-error'} style={{ margin: '16px 0 0' }}>
            {msg.text}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <button type="submit" className="btn" disabled={saving}>
            {saving ? 'Saving…' : 'Save SEO settings'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminSeoPanel;
