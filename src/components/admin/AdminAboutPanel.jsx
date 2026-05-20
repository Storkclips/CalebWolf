import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const DEFAULTS = {
  hero_eyebrow: 'About Caleb',
  hero_headline: 'Filmmaker turned photographer.',
  hero_lead: '',
  hero_image_url: '',
  block_philosophy_title: 'Philosophy',
  block_philosophy_body: '',
  block_approach_title: 'Approach',
  block_approach_body: '',
  block_location_title: 'Location',
  block_location_body: '',
  block_equipment_title: 'Equipment',
  block_equipment_body: '',
  personal_eyebrow: 'Beyond the camera',
  personal_heading: 'A few things about me',
  personal_items: [],
  personal_image_main_url: '',
  personal_image_accent_url: '',
  cta_heading: 'Ready to work together?',
  cta_subtext: '',
};

const Field = ({ label, hint, value, onChange, rows, disabled }) => (
  <label className="adm-settings-label">
    {label}
    {hint && <span className="adm-field-hint">{hint}</span>}
    {rows ? (
      <textarea rows={rows} value={value} onChange={onChange} disabled={disabled} />
    ) : (
      <input type="text" value={value} onChange={onChange} disabled={disabled} />
    )}
  </label>
);

const AdminAboutPanel = () => {
  const [data, setData] = useState(DEFAULTS);
  const [settingsId, setSettingsId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [personalItemsText, setPersonalItemsText] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: row } = await supabase.from('about_settings').select('*').maybeSingle();
      if (row) {
        setData({ ...DEFAULTS, ...row });
        setSettingsId(row.id);
        setPersonalItemsText((row.personal_items ?? []).join('\n'));
      }
      setLoading(false);
    };
    load();
  }, []);

  const set = (field) => (e) => setData((d) => ({ ...d, [field]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    const items = personalItemsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const { id: _id, ...rest } = data;
    const payload = { ...rest, personal_items: items, updated_at: new Date().toISOString() };

    const { error } = await supabase
      .from('about_settings')
      .update(payload)
      .eq('id', settingsId);

    if (error) {
      setMsg({ type: 'error', text: error.message });
    } else {
      setMsg({ type: 'success', text: 'About page saved.' });
    }
    setSaving(false);
    setTimeout(() => setMsg(null), 3000);
  };

  if (loading) {
    return (
      <div className="adm-panel">
        <div className="adm-users-loading">
          <div className="adm-users-loading-spinner" />
          <p className="muted">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="adm-panel">
      <div className="adm-panel-header">
        <div>
          <p className="eyebrow">Content</p>
          <h2>About Page</h2>
          <p className="muted">Edit all text and images shown on the About page.</p>
        </div>
        <a href="/about" target="_blank" rel="noreferrer" className="ghost">
          Preview page →
        </a>
      </div>

      <form onSubmit={handleSave}>

        {/* Hero */}
        <div className="adm-about-section">
          <h3 className="adm-about-section-title">Hero</h3>
          <div className="adm-settings-grid">
            <div className="adm-settings-card">
              <div className="adm-settings-form">
                <Field label="Eyebrow label" value={data.hero_eyebrow} onChange={set('hero_eyebrow')} disabled={saving} />
                <Field label="Headline" value={data.hero_headline} onChange={set('hero_headline')} disabled={saving} />
                <Field label="Lead paragraph" value={data.hero_lead} onChange={set('hero_lead')} rows={3} disabled={saving} />
              </div>
            </div>
            <div className="adm-settings-card">
              <div className="adm-settings-form">
                <Field label="Hero image URL" value={data.hero_image_url} onChange={set('hero_image_url')} disabled={saving} />
                {data.hero_image_url && (
                  <div className="adm-about-img-preview">
                    <img src={data.hero_image_url} alt="Hero preview" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Info blocks */}
        <div className="adm-about-section">
          <h3 className="adm-about-section-title">Info Blocks</h3>
          <div className="adm-settings-grid">
            {[
              { titleKey: 'block_philosophy_title', bodyKey: 'block_philosophy_body' },
              { titleKey: 'block_approach_title',   bodyKey: 'block_approach_body'   },
              { titleKey: 'block_location_title',   bodyKey: 'block_location_body'   },
              { titleKey: 'block_equipment_title',  bodyKey: 'block_equipment_body'  },
            ].map(({ titleKey, bodyKey }) => (
              <div key={titleKey} className="adm-settings-card">
                <div className="adm-settings-form">
                  <Field label="Title" value={data[titleKey]} onChange={set(titleKey)} disabled={saving} />
                  <Field label="Body" value={data[bodyKey]} onChange={set(bodyKey)} rows={3} disabled={saving} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Personal section */}
        <div className="adm-about-section">
          <h3 className="adm-about-section-title">Personal Section</h3>
          <div className="adm-settings-grid">
            <div className="adm-settings-card">
              <div className="adm-settings-form">
                <Field label="Eyebrow label" value={data.personal_eyebrow} onChange={set('personal_eyebrow')} disabled={saving} />
                <Field label="Heading" value={data.personal_heading} onChange={set('personal_heading')} disabled={saving} />
                <label className="adm-settings-label">
                  Bullet items
                  <span className="adm-field-hint">One item per line</span>
                  <textarea
                    rows={6}
                    value={personalItemsText}
                    onChange={(e) => setPersonalItemsText(e.target.value)}
                    disabled={saving}
                    placeholder="One bullet per line…"
                  />
                </label>
              </div>
            </div>
            <div className="adm-settings-card">
              <div className="adm-settings-form">
                <Field label="Main image URL" value={data.personal_image_main_url} onChange={set('personal_image_main_url')} disabled={saving} />
                {data.personal_image_main_url && (
                  <div className="adm-about-img-preview">
                    <img src={data.personal_image_main_url} alt="Main preview" />
                  </div>
                )}
                <Field label="Accent image URL" value={data.personal_image_accent_url} onChange={set('personal_image_accent_url')} disabled={saving} />
                {data.personal_image_accent_url && (
                  <div className="adm-about-img-preview adm-about-img-preview--sm">
                    <img src={data.personal_image_accent_url} alt="Accent preview" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="adm-about-section">
          <h3 className="adm-about-section-title">CTA Strip</h3>
          <div className="adm-settings-grid">
            <div className="adm-settings-card">
              <div className="adm-settings-form">
                <Field label="Heading" value={data.cta_heading} onChange={set('cta_heading')} disabled={saving} />
                <Field label="Subtext" value={data.cta_subtext} onChange={set('cta_subtext')} disabled={saving} />
              </div>
            </div>
          </div>
        </div>

        {msg && (
          <div className={msg.type === 'success' ? 'notice' : 'auth-error'} style={{ margin: '8px 0' }}>
            {msg.text}
          </div>
        )}

        <div className="adm-about-save-row">
          <button type="submit" className="btn" disabled={saving}>
            {saving ? 'Saving…' : 'Save about page'}
          </button>
        </div>

      </form>
    </div>
  );
};

export default AdminAboutPanel;
