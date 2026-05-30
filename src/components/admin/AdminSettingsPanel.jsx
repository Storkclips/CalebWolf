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
  const [msg, setMsg] = useState(null);
  const [editingId, setEditingId] = useState(null);

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

  const handleSaveRow = async (social) => {
    setSaving(true);
    const { error } = await supabase.from('social_links').update({
      label: social.label,
      url: social.url,
      svg_path: social.svg_path,
      color: social.color,
      sort_order: social.sort_order,
      enabled: social.enabled,
      updated_at: new Date().toISOString(),
    }).eq('id', social.id);
    if (!error) setEditingId(null);
    setMsg(error ? { type: 'error', text: error.message } : { type: 'success', text: 'Saved.' });
    setSaving(false);
    setTimeout(() => setMsg(null), 2500);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this social link?')) return;
    await supabase.from('social_links').delete().eq('id', id);
    setSocials((prev) => prev.filter((s) => s.id !== id));
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
      setEditingId(data.id);
    }
  };

  if (loading) return <div className="adm-users-loading"><div className="adm-users-loading-spinner" /><p className="muted">Loading…</p></div>;

  return (
    <div>
      <div className="adm-socials-list">
        {socials.map((s) => (
          <div key={s.id} className={`adm-social-row${editingId === s.id ? ' editing' : ''}`}>
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

            {editingId !== s.id ? (
              /* Collapsed row */
              <div className="adm-social-summary">
                <span className="adm-social-label">{s.label}</span>
                <span className="adm-social-url muted">{s.url || 'No URL'}</span>
              </div>
            ) : (
              /* Expanded edit form */
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
                <label className="adm-settings-label sm" style={{ gridColumn: '1/-1' }}>
                  SVG path data <span className="muted" style={{ fontWeight: 400 }}>(the &lt;path d="…" /&gt; value, no outer &lt;svg&gt; tag)</span>
                  <textarea
                    className="adm-social-svg-input"
                    value={s.svg_path}
                    onChange={(e) => updateLocal(s.id, 'svg_path', e.target.value)}
                    placeholder="M12 0C5.373 0 0 5.373..."
                    rows={3}
                  />
                </label>
              </div>
            )}

            <div className="adm-social-actions">
              <label className="adm-social-toggle" title={s.enabled ? 'Enabled' : 'Hidden'}>
                <input
                  type="checkbox"
                  checked={s.enabled}
                  onChange={(e) => updateLocal(s.id, 'enabled', e.target.checked)}
                />
                <span className="adm-social-toggle-track" />
              </label>
              {editingId === s.id ? (
                <>
                  <button type="button" className="btn" style={{ fontSize: 12, padding: '6px 14px' }} disabled={saving} onClick={() => handleSaveRow(s)}>Save</button>
                  <button type="button" className="ghost" style={{ fontSize: 12, padding: '6px 14px' }} onClick={() => { setEditingId(null); load(); }}>Cancel</button>
                </>
              ) : (
                <button type="button" className="ghost" style={{ fontSize: 12, padding: '6px 14px' }} onClick={() => setEditingId(s.id)}>Edit</button>
              )}
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

      <div style={{ marginTop: 16 }}>
        <button type="button" className="ghost" onClick={handleAdd}>+ Add social</button>
      </div>

      <p className="muted small" style={{ marginTop: 12 }}>
        The SVG path is the <code>d="…"</code> attribute from a 24×24 viewBox SVG. You can find these on
        <a href="https://simpleicons.org" target="_blank" rel="noopener noreferrer" style={{ marginLeft: 4 }}>simpleicons.org</a>.
        Toggle the switch to show or hide each link on the blog page.
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
