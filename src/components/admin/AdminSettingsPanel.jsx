import { useState, useEffect, useRef } from 'react';
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

/* ── SVG Help Panel ── */
const SvgHelpPanel = () => {
  const [open, setOpen] = useState(false);
  return (
    <div className="svg-help-wrap">
      <button type="button" className="svg-help-toggle" onClick={() => setOpen((v) => !v)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        How to get &amp; use SVG icons
        <svg className={`svg-help-chevron${open ? ' open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div className="svg-help-body">
          <div className="svg-help-section">
            <p className="svg-help-heading">Option 1 — Upload an SVG file</p>
            <ol className="svg-help-steps">
              <li>Find an icon on <a href="https://simpleicons.org" target="_blank" rel="noopener noreferrer">simpleicons.org</a> or any other source.</li>
              <li>Download the <code>.svg</code> file to your computer.</li>
              <li>Click <strong>Upload SVG</strong> in the edit panel — the icon path is extracted automatically.</li>
              <li>Set your color and click <strong>Save social links</strong>.</li>
            </ol>
          </div>

          <div className="svg-help-section">
            <p className="svg-help-heading">Option 2 — Paste a path from Simple Icons</p>
            <ol className="svg-help-steps">
              <li>Go to <a href="https://simpleicons.org" target="_blank" rel="noopener noreferrer">simpleicons.org</a> and search for your platform.</li>
              <li>Click the icon, then click <strong>Copy SVG</strong>.</li>
              <li>Open a text editor and paste. Find the line that starts with <code>d="…"</code> inside the <code>&lt;path&gt;</code> tag.</li>
              <li>Copy just the value between the quotes and paste it into the <strong>SVG path</strong> textarea.</li>
            </ol>
          </div>

          <div className="svg-help-section">
            <p className="svg-help-heading">Option 3 — Draw or edit your own icon</p>
            <ol className="svg-help-steps">
              <li>Use a vector tool like <a href="https://www.figma.com" target="_blank" rel="noopener noreferrer">Figma</a> or <a href="https://inkscape.org" target="_blank" rel="noopener noreferrer">Inkscape</a> to create a 24×24 icon.</li>
              <li>Export as SVG, then upload the file — the path data is extracted automatically.</li>
              <li>You can also hand-edit the path in the textarea; the preview updates in real time.</li>
            </ol>
          </div>

          <div className="svg-help-note">
            <strong>Tips:</strong> Icons must use a <code>24×24</code> viewBox for correct sizing. The color you set replaces the original fill — white (<code>#ffffff</code>) works on dark backgrounds, black (<code>#000000</code>) on light. Use <strong>Download SVG</strong> to save any icon as a <code>.svg</code> file.
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Download helper ── */
const downloadSvg = (label, svgPath, color) => {
  const safe = (label || 'icon').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const content = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color || '#ffffff'}"><path d="${svgPath}"/></svg>`;
  const blob = new Blob([content], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safe}.svg`;
  a.click();
  URL.revokeObjectURL(url);
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

  const handleToggle = async (social) => {
    const newEnabled = !social.enabled;
    updateLocal(social.id, 'enabled', newEnabled);
    setTogglingId(social.id);
    const { error } = await supabase
      .from('social_links')
      .update({ enabled: newEnabled, updated_at: new Date().toISOString() })
      .eq('id', social.id);
    if (error) {
      updateLocal(social.id, 'enabled', social.enabled);
      setMsg({ type: 'error', text: error.message });
      setTimeout(() => setMsg(null), 3000);
    }
    setTogglingId(null);
  };

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

  const handleSvgUpload = (id, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const matches = [...text.matchAll(/<path[^>]*\sd="([^"]+)"/g)];
      if (matches.length > 0) {
        updateLocal(id, 'svg_path', matches.map((m) => m[1]).join(' '));
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
      <SvgHelpPanel />

      <div className="adm-socials-list">
        {socials.map((s) => (
          <div key={s.id} className={`adm-social-row${expandedId === s.id ? ' editing' : ''}`}>
            {/* Collapsed preview icon */}
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

                {/* SVG section: large live preview + upload/download/textarea */}
                <div className="adm-social-svg-section">
                  <div className="adm-social-svg-top">
                    <div className="adm-social-svg-preview-lg" style={{ color: s.color }}>
                      {s.svg_path ? (
                        <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48">
                          <path d={s.svg_path} />
                        </svg>
                      ) : (
                        <div className="adm-social-svg-preview-empty">No icon yet</div>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <label className="adm-settings-label sm">
                        SVG icon path
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

                          {s.svg_path && (
                            <button
                              type="button"
                              className="adm-social-upload-btn"
                              title="Download as SVG file"
                              onClick={() => downloadSvg(s.label, s.svg_path, s.color)}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                              </svg>
                              Download SVG
                            </button>
                          )}
                        </div>
                        <textarea
                          className="adm-social-svg-input"
                          value={s.svg_path}
                          onChange={(e) => updateLocal(s.id, 'svg_path', e.target.value)}
                          placeholder={'Paste d="…" path data here, or upload an SVG file above'}
                          rows={3}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="adm-social-actions">
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
    </div>
  );
};

/* ── Brand / Logo Settings ── */
const LOGO_MODES = [
  { value: 'name', label: 'Name only', desc: 'Show text name in the navbar' },
  { value: 'svg',  label: 'Logo only', desc: 'Show SVG mark, no text' },
  { value: 'both', label: 'Logo + Name', desc: 'Show SVG mark beside text name' },
];

const BrandCard = () => {
  const [id, setId] = useState(null);
  const [mode, setMode] = useState('name');
  const [siteName, setSiteName] = useState('');
  const [svgPath, setSvgPath] = useState('');
  const [viewBox, setViewBox] = useState('0 0 24 24');
  const [logoSize, setLogoSize] = useState(22);
  // Hero logo state
  const [heroEnabled, setHeroEnabled] = useState(false);
  const [heroSvgPath, setHeroSvgPath] = useState('');
  const [heroViewbox, setHeroViewbox] = useState('0 0 24 24');
  const [heroColor, setHeroColor] = useState('#ffffff');
  const [heroPosX, setHeroPosX] = useState(50);
  const [heroPosY, setHeroPosY] = useState(50);
  const [heroSize, setHeroSize] = useState(120);
  const [useHeroSvgOverride, setUseHeroSvgOverride] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const svgFileRef = useRef(null);
  const heroSvgFileRef = useRef(null);

  useEffect(() => {
    supabase.from('site_identity').select('*').maybeSingle().then(({ data }) => {
      if (data) {
        setId(data.id);
        setMode(data.logo_mode || 'name');
        setSiteName(data.site_name || '');
        setSvgPath(data.logo_svg_path || '');
        setViewBox(data.logo_svg_viewbox || '0 0 24 24');
        setLogoSize(data.logo_size ?? 22);
        setHeroEnabled(data.hero_logo_enabled ?? false);
        setHeroColor(data.hero_logo_color || '#ffffff');
        setHeroPosX(data.hero_logo_position_x ?? 50);
        setHeroPosY(data.hero_logo_position_y ?? 50);
        setHeroSize(data.hero_logo_size ?? 120);
        const heroPath = data.hero_logo_svg_path || '';
        const brandPath = data.logo_svg_path || '';
        const isOverride = heroPath && heroPath !== brandPath;
        setUseHeroSvgOverride(isOverride);
        setHeroSvgPath(heroPath || brandPath);
        setHeroViewbox(data.hero_logo_viewbox || data.logo_svg_viewbox || '0 0 24 24');
      }
      setLoading(false);
    });
  }, []);

  const extractSvgParts = (text) => {
    const vbMatch = text.match(/viewBox=["']([^"']+)["']/i);
    const pathRe = /<path[^>]*\sd="([^"]+)"/gi;
    const paths = [];
    let m;
    while ((m = pathRe.exec(text)) !== null) paths.push(m[1]);
    return { viewBox: vbMatch?.[1] ?? null, path: paths.join(' ') };
  };

  const handleSvgFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { viewBox: vb, path } = extractSvgParts(ev.target.result);
      if (vb) setViewBox(vb);
      if (path) setSvgPath(path);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleHeroSvgFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { viewBox: vb, path } = extractSvgParts(ev.target.result);
      if (vb) setHeroViewbox(vb);
      if (path) setHeroSvgPath(path);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const resolvedHeroPath = useHeroSvgOverride ? heroSvgPath : svgPath;
    const resolvedHeroVb = useHeroSvgOverride ? heroViewbox : viewBox;
    const payload = {
      logo_mode: mode,
      site_name: siteName,
      logo_svg_path: svgPath,
      logo_svg_viewbox: viewBox,
      logo_size: logoSize,
      hero_logo_enabled: heroEnabled,
      hero_logo_svg_path: resolvedHeroPath,
      hero_logo_viewbox: resolvedHeroVb,
      hero_logo_color: heroColor,
      hero_logo_position_x: heroPosX,
      hero_logo_position_y: heroPosY,
      hero_logo_size: heroSize,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('site_identity').update(payload).eq('id', id);
    setMsg(error ? { type: 'error', text: error.message } : { type: 'success', text: 'Brand saved.' });
    setSaving(false);
    setTimeout(() => setMsg(null), 3000);
  };

  // Live preview values
  const showSvg = (mode === 'svg' || mode === 'both') && svgPath;
  const showName = mode === 'name' || mode === 'both';
  const heroPreviewPath = useHeroSvgOverride ? heroSvgPath : svgPath;
  const heroPreviewVb = useHeroSvgOverride ? heroViewbox : viewBox;

  if (loading) return <div className="adm-users-loading"><div className="adm-users-loading-spinner" /><p className="muted">Loading…</p></div>;

  return (
    <form onSubmit={handleSave}>
      {/* ── Navbar brand ── */}
      <div className="adm-settings-grid">
        {/* Mode picker + preview */}
        <div className="adm-settings-card">
          <h3 className="adm-settings-card-title">Logo mode</h3>
          <p className="muted small" style={{ marginBottom: 16 }}>Choose what appears in the top-left navbar and footer.</p>
          <div className="brand-mode-btns">
            {LOGO_MODES.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`brand-mode-btn${mode === opt.value ? ' active' : ''}`}
                onClick={() => setMode(opt.value)}
                disabled={saving}
              >
                <span className="brand-mode-btn-label">{opt.label}</span>
                <span className="brand-mode-btn-desc">{opt.desc}</span>
              </button>
            ))}
          </div>

          <div className="brand-preview-wrap">
            <p className="adm-settings-label-text">Preview</p>
            <div className="brand-preview">
              {showSvg && (
                <svg viewBox={viewBox} fill="currentColor" aria-hidden="true"
                  style={{ width: logoSize, height: logoSize, flexShrink: 0, color: 'inherit' }}>
                  <path d={svgPath} />
                </svg>
              )}
              {showName && <span className="brand-preview-name">{siteName || 'Site name'}</span>}
              {!showSvg && !showName && <span className="muted small">Nothing to preview</span>}
            </div>
          </div>
        </div>

        {/* Brand details */}
        <div className="adm-settings-card">
          <h3 className="adm-settings-card-title">Brand details</h3>
          <div className="adm-settings-form">
            <label className="adm-settings-label">
              Site name
              <input type="text" value={siteName} onChange={(e) => setSiteName(e.target.value)} placeholder="Caleb Wolf" disabled={saving} />
            </label>

            <label className="adm-settings-label">
              Icon size — {logoSize}px
              <input type="range" min="12" max="64" value={logoSize}
                onChange={(e) => setLogoSize(Number(e.target.value))} disabled={saving}
                style={{ marginTop: 8 }} />
            </label>

            <div className="adm-settings-label">
              <span className="adm-settings-label-text">SVG logo</span>
              <p className="muted small" style={{ margin: '4px 0 10px' }}>Upload an <code>.svg</code> file — paths extracted automatically.</p>
              <input ref={svgFileRef} type="file" accept=".svg,image/svg+xml" style={{ display: 'none' }} onChange={handleSvgFile} />
              <button type="button" className="btn btn-sm" onClick={() => svgFileRef.current?.click()} disabled={saving}>Upload SVG file</button>
            </div>

            <label className="adm-settings-label">
              viewBox
              <input type="text" value={viewBox} onChange={(e) => setViewBox(e.target.value)} placeholder="0 0 24 24" disabled={saving} />
            </label>

            <div className="adm-settings-label">
              <span className="adm-settings-label-text">SVG path data</span>
              <textarea className="adm-svg-textarea" value={svgPath} onChange={(e) => setSvgPath(e.target.value)}
                rows={4} placeholder="Paste SVG path d='...' data here, or upload a file above." disabled={saving} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Hero logo ── */}
      <div style={{ marginTop: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h3 className="adm-settings-card-title" style={{ marginBottom: 2 }}>Hero logo overlay</h3>
            <p className="muted small">Display the logo over the homepage hero image.</p>
          </div>
          <label className="brand-toggle-label">
            <input type="checkbox" checked={heroEnabled} onChange={(e) => setHeroEnabled(e.target.checked)} disabled={saving} />
            <span className="brand-toggle-track"><span className="brand-toggle-thumb" /></span>
            <span className="brand-toggle-text">{heroEnabled ? 'Visible' : 'Hidden'}</span>
          </label>
        </div>

        {heroEnabled && (
          <div className="adm-settings-grid">
            {/* Hero logo preview */}
            <div className="adm-settings-card">
              <h3 className="adm-settings-card-title">Preview</h3>
              <div className="hero-logo-preview-wrap">
                <div className="hero-logo-preview-stage"
                  style={{ '--hero-pos-x': `${heroPosX}%`, '--hero-pos-y': `${heroPosY}%` }}>
                  {heroPreviewPath ? (
                    <svg viewBox={heroPreviewVb} fill={heroColor} aria-hidden="true"
                      style={{ width: Math.round(heroSize * 0.4), height: Math.round(heroSize * 0.4) }}>
                      <path d={heroPreviewPath} />
                    </svg>
                  ) : (
                    <span className="muted small" style={{ color: '#fff' }}>No SVG yet</span>
                  )}
                </div>
              </div>
            </div>

            {/* Hero logo controls */}
            <div className="adm-settings-card">
              <h3 className="adm-settings-card-title">Position &amp; style</h3>
              <div className="adm-settings-form">

                <label className="adm-settings-label">
                  Size — {heroSize}px
                  <input type="range" min="40" max="400" value={heroSize}
                    onChange={(e) => setHeroSize(Number(e.target.value))} disabled={saving}
                    style={{ marginTop: 8 }} />
                </label>

                <label className="adm-settings-label">
                  Color
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 6 }}>
                    <input type="color" value={heroColor} onChange={(e) => setHeroColor(e.target.value)}
                      disabled={saving} style={{ width: 40, height: 32, padding: 2, cursor: 'pointer', borderRadius: 4, border: '1px solid var(--border)' }} />
                    <input type="text" value={heroColor} onChange={(e) => setHeroColor(e.target.value)}
                      placeholder="#ffffff" disabled={saving} style={{ flex: 1 }} />
                  </div>
                </label>

                <label className="adm-settings-label">
                  Horizontal position — {heroPosX}% {heroPosX === 50 ? '(center)' : heroPosX < 50 ? '(left)' : '(right)'}
                  <input type="range" min="0" max="100" value={heroPosX}
                    onChange={(e) => setHeroPosX(Number(e.target.value))} disabled={saving}
                    style={{ marginTop: 8 }} />
                </label>

                <label className="adm-settings-label">
                  Vertical position — {heroPosY}% {heroPosY === 50 ? '(center)' : heroPosY < 50 ? '(top)' : '(bottom)'}
                  <input type="range" min="0" max="100" value={heroPosY}
                    onChange={(e) => setHeroPosY(Number(e.target.value))} disabled={saving}
                    style={{ marginTop: 8 }} />
                </label>

                <label className="adm-settings-label brand-toggle-row">
                  <span>Use different SVG for hero</span>
                  <input type="checkbox" checked={useHeroSvgOverride}
                    onChange={(e) => setUseHeroSvgOverride(e.target.checked)} disabled={saving} />
                </label>

                {useHeroSvgOverride && (
                  <>
                    <div className="adm-settings-label">
                      <span className="adm-settings-label-text">Hero SVG</span>
                      <input ref={heroSvgFileRef} type="file" accept=".svg,image/svg+xml" style={{ display: 'none' }} onChange={handleHeroSvgFile} />
                      <button type="button" className="btn btn-sm" style={{ marginTop: 6 }} onClick={() => heroSvgFileRef.current?.click()} disabled={saving}>Upload hero SVG</button>
                    </div>
                    <label className="adm-settings-label">
                      Hero viewBox
                      <input type="text" value={heroViewbox} onChange={(e) => setHeroViewbox(e.target.value)} placeholder="0 0 24 24" disabled={saving} />
                    </label>
                    <div className="adm-settings-label">
                      <span className="adm-settings-label-text">Hero SVG path data</span>
                      <textarea className="adm-svg-textarea" value={heroSvgPath} onChange={(e) => setHeroSvgPath(e.target.value)}
                        rows={3} placeholder="Paste SVG path d='...' data" disabled={saving} />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {msg && (
        <div className={msg.type === 'success' ? 'notice' : 'auth-error'} style={{ margin: '16px 0 0' }}>
          {msg.text}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
        <button type="submit" className="btn" disabled={saving}>
          {saving ? 'Saving…' : 'Save brand'}
        </button>
      </div>
    </form>
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
      <h3 className="adm-settings-section-title">Brand &amp; Logo</h3>
      <p className="muted small" style={{ marginBottom: 16 }}>
        Controls what appears in the top-left of the navbar and footer — a text name, an SVG mark, or both.
      </p>
      <BrandCard />
    </div>

    <div className="adm-settings-section" style={{ marginTop: 40 }}>
      <h3 className="adm-settings-section-title">Contact &amp; Notifications</h3>
      <ContactCard />
    </div>

    <div className="adm-settings-section" style={{ marginTop: 40 }}>
      <h3 className="adm-settings-section-title">Social Links</h3>
      <p className="muted small" style={{ marginBottom: 16 }}>
        These icons appear in the "Follow" section at the bottom of the Journal page. Add, reorder, recolor, or hide any platform.
      </p>
      <SocialLinksCard />
    </div>
  </div>
);

export default AdminSettingsPanel;
