import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

/* ── Contact Settings ── */
const ContactCard = () => {
  const [fields, setFields] = useState({ admin_email: '', contact_email: '', based_in: '', response_time: '' });
  const [settingsId, setSettingsId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    supabase.from('contact_settings').select('*').maybeSingle().then(({ data }) => {
      if (data) {
        setFields({ admin_email: data.admin_email || '', contact_email: data.contact_email || '', based_in: data.based_in || '', response_time: data.response_time || '' });
        setSettingsId(data.id);
      }
      setLoading(false);
    });
  }, []);

  const set = (field) => (e) => setFields((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const { error } = await supabase.from('contact_settings').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', settingsId);
    setMsg(error ? { type: 'error', text: error.message } : { type: 'success', text: 'Settings saved.' });
    setSaving(false);
    setTimeout(() => setMsg(null), 3000);
  };

  if (loading) return <div className="adm-users-loading"><div className="adm-users-loading-spinner" /><p className="muted">Loading…</p></div>;

  return (
    <form onSubmit={handleSave}>
      <div className="adm-settings-grid">
        <div className="adm-settings-card">
          <h3 className="adm-settings-card-title">Contact page info</h3>
          <p className="muted small" style={{ marginBottom: 20 }}>These values are displayed publicly on the contact page.</p>
          <div className="adm-settings-form">
            <label className="adm-settings-label">Public email<input type="email" value={fields.contact_email} onChange={set('contact_email')} placeholder="hello@example.com" disabled={saving} /></label>
            <label className="adm-settings-label">Based in<input type="text" value={fields.based_in} onChange={set('based_in')} placeholder="Portland, Oregon" disabled={saving} /></label>
            <label className="adm-settings-label">Response time<input type="text" value={fields.response_time} onChange={set('response_time')} placeholder="Within 1 business day" disabled={saving} /></label>
          </div>
        </div>
        <div className="adm-settings-card">
          <h3 className="adm-settings-card-title">Notifications</h3>
          <p className="muted small" style={{ marginBottom: 20 }}>When someone submits the contact form, a notification is sent to this address.</p>
          <div className="adm-settings-form">
            <label className="adm-settings-label">Admin notification email<input type="email" value={fields.admin_email} onChange={set('admin_email')} required placeholder="admin@example.com" disabled={saving} /></label>
          </div>
        </div>
      </div>
      {msg && <div className={msg.type === 'success' ? 'notice' : 'auth-error'} style={{ margin: '16px 0 0' }}>{msg.text}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
        <button type="submit" className="btn" disabled={saving || !fields.admin_email.trim()}>{saving ? 'Saving…' : 'Save settings'}</button>
      </div>
    </form>
  );
};

/* ── Social Links Editor ── */
const SocialLinksCard = () => {
  const [socials, setSocials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [msg, setMsg] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('social_links').select('*').order('sort_order', { ascending: true });
    setSocials(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateLocal = (id, field, value) => {
    setSocials((prev) => prev.map((s) => s.id === id ? { ...s, [field]: value } : s));
  };

  // Toggle saves immediately
  const handleToggle = async (social) => {
    const newEnabled = !social.enabled;
    updateLocal(social.id, 'enabled', newEnabled);
    setTogglingId(social.id);
    const { error } = await supabase
      .from('social_links')
      .update({ enabled: newEnabled, updated_at: new Date().toISOString() })
      .eq('id', social.id);
    if (error) {
      updateLocal(social.id, 'enabled', social.enabled); // revert
      setMsg({ type: 'error', text: error.message });
      setTimeout(() => setMsg(null), 3000);
    }
    setTogglingId(null);
  };

  // Save all rows at once
  const handleSaveAll = async () => {
    setSaving(true);
    setMsg(null);
    const now = new Date().toISOString();
    const updates = socials.map((s) =>
      supabase.from('social_links').update({
        label: s.label,
        url: s.url,
        svg_path: s.svg_path,
        color: s.color,
        sort_order: s.sort_order,
        enabled: s.enabled,
        updated_at: now,
      }).eq('id', s.id)
    );
    const results = await Promise.all(updates);
    const failed = results.find((r) => r.error);
    setMsg(failed ? { type: 'error', text: failed.error.message } : { type: 'success', text: 'Social links saved.' });
    setSaving(false);
    setTimeout(() => setMsg(null), 3000);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this social link?')) return;
    await supabase.from('social_links').delete().eq('id', id);
    setSocials((prev) => prev.filter((s) => s.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const handleAdd = async () => {
    const maxOrder = socials.reduce((m, s) => Math.max(m, s.sort_order), 0);
    const { data, error } = await supabase.from('social_links').insert({
      platform: 'custom',
      label: 'New Social',
      url: '',
      svg_path: '',
      color: '#ffffff',
      sort_order: maxOrder + 1,
      enabled: false,
    }).select().maybeSingle();
    if (!error && data) {
      setSocials((prev) => [...prev, data]);
      setExpandedId(data.id);
    }
  };

  // Parse SVG file and extract the first <path d="..."> value
  const handleSvgUpload = (id, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      // Try to extract path d attribute — grab all paths and join
      const matches = [...text.matchAll(/<path[^>]*\sd="([^"]+)"/g)];
      if (matches.length > 0) {
        const combined = matches.map((m) => m[1]).join(' ');
        updateLocal(id, 'svg_path', combined);
      } else {
        setMsg({ type: 'error', text: 'No <path d="..."> found in that SVG file.' });
        setTimeout(() => setMsg(null), 4000);
      }
    };
    reader.readAsText(file);
  };

  if (loading) return <div className="adm-users-loading"><div className="adm-users-loading-spinner" /><p className="muted">Loading…</p></div>;

  return (
    <div>
      <div className="adm-socials-list">
        {socials.map((s) => (
          <div key={s.id} className={`adm-social-row${expandedId === s.id ? ' editing' : ''}`}>
            {/* Preview icon */}
            <div className="adm-social-preview" style={{ color: s.color }}>
              {s.svg_path ? (
                <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                  <path d={s.svg_path} />
                </svg>
              ) : (
                <div className="adm-social-noicon">?</div>
              )}
            </div>

            {expandedId !== s.id ? (
              <div className="adm-social-summary">
                <span className="adm-social-label">{s.label}</span>
                <span className="adm-social-url muted">{s.url || 'No URL set'}</span>
              </div>
            ) : (
              <div className="adm-social-edit-fields">
                <div className="adm-social-edit-row">
                  <label className="adm-settings-label sm">Label
                    <input type="text" value={s.label} onChange={(e) => updateLocal(s.id, 'label', e.target.value)} placeholder="Display name" />
                  </label>
                  <label className="adm-settings-label sm">Profile URL
                    <input type="url" value={s.url} onChange={(e) => updateLocal(s.id, 'url', e.target.value)} placeholder="https://..." />
                  </label>
                  <label className="adm-settings-label sm">Icon color
                    <div className="adm-social-color-row">
                      <input type="color" value={s.color} onChange={(e) => updateLocal(s.id, 'color', e.target.value)} className="adm-social-color-swatch" />
                      <input type="text" value={s.color} onChange={(e) => updateLocal(s.id, 'color', e.target.value)} placeholder="#ffffff" />
                    </div>
                  </label>
                  <label className="adm-settings-label sm">Sort order
                    <input type="number" value={s.sort_order} onChange={(e) => updateLocal(s.id, 'sort_order', parseInt(e.target.value, 10) || 0)} min="0" />
                  </label>
                </div>

                {/* SVG path — manual input or file upload */}
                <div className="adm-social-svg-section">
                  <label className="adm-settings-label sm" style={{ gridColumn: '1/-1' }}>
                    SVG icon
                    <div className="adm-social-svg-toolbar">
                      <label className="adm-social-upload-btn" title="Upload an .svg file">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                        Upload SVG
                        <input
                          type="file"
                          accept=".svg,image/svg+xml"
                          style={{ display: 'none' }}
                          onChange={(e) => handleSvgUpload(s.id, e.target.files?.[0])}
                        />
                      </label>
                      <span className="muted" style={{ fontSize: 11 }}>or paste the <code>d="…"</code> path below</span>
                    </div>
                    <textarea
                      className="adm-social-svg-input"
                      value={s.svg_path}
                      onChange={(e) => updateLocal(s.id, 'svg_path', e.target.value)}
                      placeholder="M12 0C5.373 0 0 5.373..."
                      rows={3}
                    />
                  </label>
                </div>
              </div>
            )}

            <div className="adm-social-actions">
              {/* Toggle — saves immediately */}
              <label className="adm-social-toggle" title={s.enabled ? 'Visible — click to hide' : 'Hidden — click to show'}>
                <input
                  type="checkbox"
                  checked={s.enabled}
                  disabled={togglingId === s.id}
                  onChange={() => handleToggle(s)}
                />
                <span className="adm-social-toggle-track" />
              </label>

              <button
                type="button"
                className="ghost"
                style={{ fontSize: 12, padding: '6px 14px' }}
                onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
              >
                {expandedId === s.id ? 'Close' : 'Edit'}
              </button>

              <button type="button" className="adm-social-delete-btn" title="Delete" onClick={() => handleDelete(s.id)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {msg && <div className={msg.type === 'success' ? 'notice' : 'auth-error'} style={{ margin: '12px 0 0' }}>{msg.text}</div>}

      <div style={{ display: 'flex', gap: 10, marginTop: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" className="ghost" onClick={handleAdd}>+ Add social</button>
        <button type="button" className="btn" onClick={handleSaveAll} disabled={saving}>
          {saving ? 'Saving…' : 'Save social links'}
        </button>
      </div>

      <p className="muted small" style={{ marginTop: 12 }}>
        Upload any .svg file — the icon path is extracted automatically. You can also paste a path from
        <a href="https://simpleicons.org" target="_blank" rel="noopener noreferrer" style={{ marginLeft: 4 }}>simpleicons.org</a>.
        The toggle saves instantly.
      </p>
    </div>
  );
};

/* ── Main panel ── */
const AdminSettingsPanel = () => (
  <div className="adm-panel">
    <div className="adm-panel-header">
      <div>
        <p className="eyebrow">Configuration</p>
        <h2>Settings</h2>
        <p className="muted">Site-wide configuration options.</p>
      </div>
    </div>

    <div className="adm-settings-section">
      <h3 className="adm-settings-section-title">Contact &amp; Notifications</h3>
      <ContactCard />
    </div>

    <div className="adm-settings-section" style={{ marginTop: 40 }}>
      <h3 className="adm-settings-section-title">Social Links</h3>
      <p className="muted small" style={{ marginBottom: 20 }}>
        These icons appear in the "Follow" section at the bottom of the Journal page. Add, reorder, recolor, or hide any platform.
      </p>
      <SocialLinksCard />
    </div>
  </div>
);

export default AdminSettingsPanel;
