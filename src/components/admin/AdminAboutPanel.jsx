import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

// ─── helpers ────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 10);

const SECTION_TEMPLATES = {
  hero: () => ({
    id: uid(), type: 'hero', label: 'Hero',
    eyebrow: '', headline: '', lead: '', image_url: '',
  }),
  blocks: () => ({
    id: uid(), type: 'blocks', label: 'Info Blocks',
    items: [{ id: uid(), title: 'New block', body: '' }],
  }),
  personal: () => ({
    id: uid(), type: 'personal', label: 'Personal',
    eyebrow: '', heading: '', items: [], image_main_url: '', image_accent_url: '',
  }),
  cta: () => ({
    id: uid(), type: 'cta', label: 'CTA Strip',
    heading: '', subtext: '',
  }),
  text: () => ({
    id: uid(), type: 'text', label: 'Text Block',
    heading: '', body: '',
  }),
};

const SECTION_TYPE_LABELS = {
  hero: 'Hero',
  blocks: 'Info Blocks',
  personal: 'Personal',
  cta: 'CTA Strip',
  text: 'Text Block',
};

// ─── tiny shared UI ──────────────────────────────────────────────────────────

const Field = ({ label, hint, value, onChange, rows, disabled, placeholder }) => (
  <label className="adm-settings-label">
    {label}
    {hint && <span className="adm-field-hint">{hint}</span>}
    {rows ? (
      <textarea rows={rows} value={value ?? ''} onChange={onChange} disabled={disabled} placeholder={placeholder} />
    ) : (
      <input type="text" value={value ?? ''} onChange={onChange} disabled={disabled} placeholder={placeholder} />
    )}
  </label>
);

const ImgPreview = ({ url, size }) => (
  url ? (
    <div className={`adm-about-img-preview${size === 'sm' ? ' adm-about-img-preview--sm' : ''}`}>
      <img src={url} alt="preview" />
    </div>
  ) : null
);

const RemoveBtn = ({ onClick, label = 'Remove' }) => (
  <button type="button" className="adm-about-remove-btn" onClick={onClick} title={label}>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  </button>
);

// ─── section editors ─────────────────────────────────────────────────────────

const HeroEditor = ({ sec, update, disabled }) => (
  <div className="adm-settings-grid">
    <div className="adm-settings-card">
      <div className="adm-settings-form">
        <Field label="Eyebrow" value={sec.eyebrow} onChange={e => update('eyebrow', e.target.value)} disabled={disabled} />
        <Field label="Headline" value={sec.headline} onChange={e => update('headline', e.target.value)} disabled={disabled} />
        <Field label="Lead paragraph" value={sec.lead} onChange={e => update('lead', e.target.value)} rows={3} disabled={disabled} />
      </div>
    </div>
    <div className="adm-settings-card">
      <div className="adm-settings-form">
        <Field label="Image URL" value={sec.image_url} onChange={e => update('image_url', e.target.value)} disabled={disabled} placeholder="https://…" />
        <ImgPreview url={sec.image_url} />
      </div>
    </div>
  </div>
);

const BlocksEditor = ({ sec, update, disabled }) => {
  const setItem = (idx, field, val) => {
    const items = sec.items.map((it, i) => i === idx ? { ...it, [field]: val } : it);
    update('items', items);
  };
  const addItem = () => update('items', [...sec.items, { id: uid(), title: '', body: '' }]);
  const removeItem = (idx) => update('items', sec.items.filter((_, i) => i !== idx));

  return (
    <div className="adm-settings-form" style={{ gap: 0 }}>
      <div className="adm-settings-grid">
        {sec.items.map((item, idx) => (
          <div key={item.id} className="adm-settings-card adm-about-removable">
            <RemoveBtn onClick={() => removeItem(idx)} label="Remove block" />
            <div className="adm-settings-form">
              <Field label="Title" value={item.title} onChange={e => setItem(idx, 'title', e.target.value)} disabled={disabled} />
              <Field label="Body" value={item.body} onChange={e => setItem(idx, 'body', e.target.value)} rows={3} disabled={disabled} />
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="adm-about-add-block" onClick={addItem} disabled={disabled}>
        + Add block
      </button>
    </div>
  );
};

const PersonalEditor = ({ sec, update, disabled }) => {
  const itemsText = (sec.items ?? []).join('\n');
  const setItems = (val) => update('items', val.split('\n').map(s => s.trim()).filter(Boolean));

  return (
    <div className="adm-settings-grid">
      <div className="adm-settings-card">
        <div className="adm-settings-form">
          <Field label="Eyebrow" value={sec.eyebrow} onChange={e => update('eyebrow', e.target.value)} disabled={disabled} />
          <Field label="Heading" value={sec.heading} onChange={e => update('heading', e.target.value)} disabled={disabled} />
          <Field label="Bullet items" hint="One item per line" value={itemsText}
            onChange={e => setItems(e.target.value)} rows={6} disabled={disabled} placeholder="One bullet per line…" />
        </div>
      </div>
      <div className="adm-settings-card">
        <div className="adm-settings-form">
          <Field label="Main image URL" value={sec.image_main_url} onChange={e => update('image_main_url', e.target.value)} disabled={disabled} placeholder="https://…" />
          <ImgPreview url={sec.image_main_url} />
          <Field label="Accent image URL" value={sec.image_accent_url} onChange={e => update('image_accent_url', e.target.value)} disabled={disabled} placeholder="https://…" />
          <ImgPreview url={sec.image_accent_url} size="sm" />
        </div>
      </div>
    </div>
  );
};

const CtaEditor = ({ sec, update, disabled }) => (
  <div className="adm-settings-grid">
    <div className="adm-settings-card">
      <div className="adm-settings-form">
        <Field label="Heading" value={sec.heading} onChange={e => update('heading', e.target.value)} disabled={disabled} />
        <Field label="Subtext" value={sec.subtext} onChange={e => update('subtext', e.target.value)} disabled={disabled} />
      </div>
    </div>
  </div>
);

const TextEditor = ({ sec, update, disabled }) => (
  <div className="adm-settings-grid">
    <div className="adm-settings-card">
      <div className="adm-settings-form">
        <Field label="Heading (optional)" value={sec.heading} onChange={e => update('heading', e.target.value)} disabled={disabled} />
        <Field label="Body" value={sec.body} onChange={e => update('body', e.target.value)} rows={5} disabled={disabled} />
      </div>
    </div>
  </div>
);

const EDITORS = { hero: HeroEditor, blocks: BlocksEditor, personal: PersonalEditor, cta: CtaEditor, text: TextEditor };

// ─── section wrapper ─────────────────────────────────────────────────────────

const SectionEditor = ({ sec, index, total, onChange, onRemove, onMove, disabled }) => {
  const [open, setOpen] = useState(true);
  const update = useCallback((field, val) => onChange({ ...sec, [field]: val }), [sec, onChange]);
  const Editor = EDITORS[sec.type];

  return (
    <div className="adm-about-sec-wrap">
      <div className="adm-about-sec-header">
        <button type="button" className="adm-about-sec-toggle" onClick={() => setOpen(o => !o)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            style={{ transform: open ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform .15s' }}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span className="adm-about-sec-type-badge">{SECTION_TYPE_LABELS[sec.type]}</span>
          <input
            className="adm-about-sec-label-input"
            value={sec.label ?? ''}
            onChange={e => { e.stopPropagation(); update('label', e.target.value); }}
            onClick={e => e.stopPropagation()}
            placeholder="Section label…"
            disabled={disabled}
          />
        </button>
        <div className="adm-about-sec-actions">
          <button type="button" className="adm-about-icon-btn" onClick={() => onMove(index, -1)} disabled={index === 0 || disabled} title="Move up">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15" /></svg>
          </button>
          <button type="button" className="adm-about-icon-btn" onClick={() => onMove(index, 1)} disabled={index === total - 1 || disabled} title="Move down">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          <button type="button" className="adm-about-icon-btn adm-about-icon-btn--danger" onClick={onRemove} disabled={disabled} title="Remove section">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
            </svg>
          </button>
        </div>
      </div>
      {open && Editor && (
        <div className="adm-about-sec-body">
          <Editor sec={sec} update={update} disabled={disabled} />
        </div>
      )}
    </div>
  );
};

// ─── main panel ──────────────────────────────────────────────────────────────

const AdminAboutPanel = () => {
  const [sections, setSections] = useState([]);
  const [settingsId, setSettingsId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [addType, setAddType] = useState('blocks');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: row } = await supabase.from('about_settings').select('id, sections').maybeSingle();
      if (row) {
        setSections(row.sections ?? []);
        setSettingsId(row.id);
      }
      setLoading(false);
    };
    load();
  }, []);

  const updateSection = useCallback((idx, sec) => {
    setSections(prev => prev.map((s, i) => i === idx ? sec : s));
  }, []);

  const removeSection = (idx) => setSections(prev => prev.filter((_, i) => i !== idx));

  const moveSection = (idx, dir) => {
    setSections(prev => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const addSection = () => {
    setSections(prev => [...prev, SECTION_TEMPLATES[addType]()]);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const { error } = await supabase
      .from('about_settings')
      .update({ sections, updated_at: new Date().toISOString() })
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
          <p className="muted">Add, remove, and reorder sections. Changes save as a whole page.</p>
        </div>
        <a href="/about" target="_blank" rel="noreferrer" className="ghost">Preview →</a>
      </div>

      <form onSubmit={handleSave}>
        <div className="adm-about-sections-list">
          {sections.map((sec, idx) => (
            <SectionEditor
              key={sec.id}
              sec={sec}
              index={idx}
              total={sections.length}
              onChange={(s) => updateSection(idx, s)}
              onRemove={() => removeSection(idx)}
              onMove={moveSection}
              disabled={saving}
            />
          ))}
          {sections.length === 0 && (
            <p className="muted small" style={{ textAlign: 'center', padding: '32px 0' }}>
              No sections yet. Add one below.
            </p>
          )}
        </div>

        {/* Add section row */}
        <div className="adm-about-add-section-row">
          <select
            className="adm-about-type-select"
            value={addType}
            onChange={e => setAddType(e.target.value)}
            disabled={saving}
          >
            {Object.entries(SECTION_TYPE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <button type="button" className="ghost" onClick={addSection} disabled={saving}>
            + Add section
          </button>
        </div>

        {msg && (
          <div className={msg.type === 'success' ? 'notice' : 'auth-error'} style={{ margin: '12px 0 0' }}>
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
