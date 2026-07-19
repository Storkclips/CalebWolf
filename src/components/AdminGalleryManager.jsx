import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useThemes, useAllGalleryImages } from '../hooks/useGallery';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function triggerWebpConversion(storagePath, imageId) {
  try {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session) return;
    await fetch(`${SUPABASE_URL}/functions/v1/convert-to-webp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        Apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ storagePath, imageId }),
    });
  } catch {
    // Non-fatal — display falls back to original
  }
}

const EMPTY_IMAGE = { title: '', url: '', price: 3, theme_id: '', is_published: true };
const EMPTY_THEME = { name: '', slug: '', sort_order: 0, cover_url: '' };

function generateFilePath(file) {
  const ext = file.name.split('.').pop();
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `images/${ts}-${rand}.${ext}`;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// ── Shared upload helper ─────────────────────────────────────────────────────
async function uploadToStorage(file, onError) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    onError('Only JPG, PNG, WebP, and GIF files are allowed');
    return null;
  }
  if (file.size > 10 * 1024 * 1024) {
    onError('File must be under 10 MB');
    return null;
  }
  const path = generateFilePath(file);
  const { error } = await supabase.storage.from('gallery').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) {
    onError(`Upload failed: ${error.message}`);
    return null;
  }
  const { data: urlData } = supabase.storage.from('gallery').getPublicUrl(path);
  return urlData.publicUrl;
}

// ── Dropzone ─────────────────────────────────────────────────────────────────
function Dropzone({ onFile, uploading, hasFile, label = 'Drag & drop an image, or click to browse', accept = 'image/jpeg,image/png,image/webp,image/gif' }) {
  const [drag, setDrag] = useState(false);
  const ref = useRef(null);
  return (
    <div
      className={`gallery-dropzone${drag ? ' drag' : ''}${uploading ? ' uploading' : ''}${hasFile ? ' has-file' : ''}`}
      onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onClick={() => ref.current?.click()}
    >
      <input ref={ref} type="file" accept={accept} style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      <span className="muted small">
        {uploading ? 'Uploading…' : hasFile ? 'Click or drop to replace' : label}
      </span>
    </div>
  );
}

// ── Modal wrapper ─────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, footer, wide }) {
  return (
    <div className="gm-backdrop" onClick={onClose}>
      <div className={`gm-modal${wide ? ' wide' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="gm-header">
          <h3 className="gm-title">{title}</h3>
          <button className="gm-close" type="button" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="gm-body">{children}</div>
        {footer && <div className="gm-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ── Variants section (edit mode only) ────────────────────────────────────────
function VariantsSection({ imageId }) {
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('image_variants')
      .select('*')
      .eq('image_id', imageId)
      .order('sort_order');
    setVariants(data ?? []);
    setLoading(false);
  };

  useState(() => { load(); }, []);

  const handleAddVariant = async (file) => {
    if (!label.trim()) { setErr('Enter a label before uploading'); return; }
    setUploading(true);
    setErr(null);
    const url = await uploadToStorage(file, setErr);
    if (!url) { setUploading(false); return; }
    const { error } = await supabase.from('image_variants').insert({
      image_id: imageId,
      label: label.trim(),
      url,
      sort_order: variants.length,
    });
    if (error) { setErr(error.message); setUploading(false); return; }
    setLabel('');
    setAdding(false);
    setUploading(false);
    await load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this variant?')) return;
    await supabase.from('image_variants').delete().eq('id', id);
    await load();
  };

  const FILE_LABELS = ['Web (2000px)', 'Print Quality (4000px)', 'Original PNG', 'Original JPEG', 'Full Resolution'];

  return (
    <div className="gm-variants">
      <div className="gm-variants-header">
        <label className="gm-label" style={{ margin: 0 }}>Download variants</label>
        {!adding && (
          <button type="button" className="ghost" style={{ fontSize: 12, padding: '3px 12px' }}
            onClick={() => { setAdding(true); setErr(null); }}>
            + Add variant
          </button>
        )}
      </div>
      <p className="muted small" style={{ margin: '2px 0 8px' }}>
        Buyers choose from these options when downloading. "Original" is always available as a fallback.
      </p>
      {err && <div className="gm-error" style={{ marginBottom: 6 }}>{err}</div>}
      {loading ? (
        <p className="muted small">Loading…</p>
      ) : (
        <>
          {variants.length > 0 && (
            <div className="gm-variant-list">
              {variants.map((v) => (
                <div key={v.id} className="gm-variant-row">
                  <div className="gm-variant-info">
                    <span className="gm-variant-label">{v.label}</span>
                    <span className="muted" style={{ fontSize: 11 }}>
                      {v.url.split('/').pop().replace(/^[0-9]+-[a-z0-9]+\./, '….')}
                    </span>
                  </div>
                  <button type="button" className="ghost danger-btn"
                    style={{ fontSize: 11, padding: '2px 10px', flexShrink: 0 }}
                    onClick={() => handleDelete(v.id)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
          {adding && (
            <div className="gm-variant-add">
              <div className="gm-variant-label-row">
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Web (2000px), Print Quality…"
                  className="gm-variant-label-input"
                  disabled={uploading}
                  list="variant-label-suggestions"
                />
                <datalist id="variant-label-suggestions">
                  {FILE_LABELS.map((l) => <option key={l} value={l} />)}
                </datalist>
                <button type="button" className="ghost"
                  style={{ fontSize: 12, padding: '4px 12px', flexShrink: 0 }}
                  onClick={() => { setAdding(false); setLabel(''); setErr(null); }}
                  disabled={uploading}>
                  Cancel
                </button>
              </div>
              <Dropzone
                onFile={handleAddVariant}
                uploading={uploading}
                hasFile={false}
                label={label.trim() ? `Upload file for "${label}"` : 'Enter a label above, then drop a file here'}
              />
              {!label.trim() && (
                <p className="muted small" style={{ margin: '4px 0 0' }}>
                  Enter a variant label first, then drop or select the file to upload automatically.
                </p>
              )}
            </div>
          )}
          {variants.length === 0 && !adding && (
            <p className="muted small" style={{ fontStyle: 'italic' }}>
              No variants added. Buyers will download the original file.
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ── Add/Edit Image modal ──────────────────────────────────────────────────────
function ImageModal({ initial, themes, onSave, onClose }) {
  const [form, setForm] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const isEdit = !!initial.id;

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleFile = async (file) => {
    setUploading(true);
    const url = await uploadToStorage(file, setErr);
    setUploading(false);
    if (url) {
      set('url', url);
      if (!form.title) {
        const name = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
        set('title', name.charAt(0).toUpperCase() + name.slice(1));
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const disabled = saving || uploading || !form.title || !form.url || !form.theme_id;

  return (
    <Modal
      title={isEdit ? 'Edit Image' : 'Add Image'}
      onClose={onClose}
      footer={
        <>
          <button className="pill" type="button" onClick={handleSave} disabled={disabled}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add image'}
          </button>
          <button className="ghost" type="button" onClick={onClose}>Cancel</button>
        </>
      }
    >
      <div className="gm-form">
        {err && <div className="gm-error">{err}</div>}
        <div className="gm-field">
          <label className="gm-label">Image</label>
          <Dropzone onFile={handleFile} uploading={uploading} hasFile={!!form.url} />
          {form.url && (
            <img src={form.url} alt="Preview" className="gm-preview-img" />
          )}
        </div>
        <div className="gm-field">
          <label className="gm-label">Title</label>
          <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Golden Hour Portrait" />
        </div>
        <div className="gm-field">
          <label className="gm-label">Theme</label>
          <select value={form.theme_id} onChange={(e) => set('theme_id', e.target.value)}>
            <option value="">Select theme</option>
            {themes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="gm-field">
          <label className="gm-label">Price (credits)</label>
          <input type="number" min="1" value={form.price} onChange={(e) => set('price', e.target.value)} />
        </div>
        <label className="gm-check-label">
          <input type="checkbox" checked={form.is_published} onChange={(e) => set('is_published', e.target.checked)} />
          Published
        </label>
        {isEdit && (
          <div className="gm-field" style={{ marginTop: 8 }}>
            <VariantsSection imageId={form.id} />
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Add/Edit Theme modal ──────────────────────────────────────────────────────
function ThemeModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const isEdit = !!initial.id;

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleFile = async (file) => {
    setUploading(true);
    const url = await uploadToStorage(file, setErr);
    setUploading(false);
    if (url) set('cover_url', url);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const disabled = saving || uploading || !form.name || !form.slug;

  return (
    <Modal
      title={isEdit ? 'Edit Theme' : 'New Theme'}
      onClose={onClose}
      footer={
        <>
          <button className="pill" type="button" onClick={handleSave} disabled={disabled}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create theme'}
          </button>
          <button className="ghost" type="button" onClick={onClose}>Cancel</button>
        </>
      }
    >
      <div className="gm-form">
        {err && <div className="gm-error">{err}</div>}
        <div className="gm-field">
          <label className="gm-label">Thumbnail</label>
          <Dropzone onFile={handleFile} uploading={uploading} hasFile={!!form.cover_url} label="Upload a thumbnail image" />
          {form.cover_url && (
            <img src={form.cover_url} alt="Thumbnail" className="gm-preview-img" style={{ height: 120 }} />
          )}
        </div>
        <div className="gm-field">
          <label className="gm-label">Name</label>
          <input
            value={form.name}
            onChange={(e) => {
              const name = e.target.value;
              set('name', name);
              if (!isEdit) set('slug', name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
            }}
            placeholder="Weddings"
          />
        </div>
        <div className="gm-field">
          <label className="gm-label">Slug</label>
          <input value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="weddings" />
        </div>
        <div className="gm-field">
          <label className="gm-label">Sort order</label>
          <input type="number" value={form.sort_order} onChange={(e) => set('sort_order', e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}

// ── Bulk upload modal ─────────────────────────────────────────────────────────
function BulkUploadModal({ themes, onDone, onClose }) {
  const [items, setItems] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const [progress, setProgress] = useState(null);
  const fileInputRef = useRef(null);

  const defaultThemeId = themes[0]?.id || '';

  const addFiles = async (files) => {
    const arr = Array.from(files).filter((f) => ALLOWED_TYPES.includes(f.type) && f.size <= 10 * 1024 * 1024);
    if (!arr.length) return;
    setUploading(true);
    setErr(null);

    const newItems = [];
    for (const file of arr) {
      const name = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
      const title = name.charAt(0).toUpperCase() + name.slice(1);
      newItems.push({
        _id: `${Date.now()}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
        title,
        theme_id: defaultThemeId,
        price: 3,
        is_published: true,
        url: null,
        uploaded: false,
        uploading: false,
        uploadError: null,
      });
    }
    setItems((prev) => [...prev, ...newItems]);
    setUploading(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  };

  const updateItem = (id, patch) =>
    setItems((prev) => prev.map((it) => (it._id === id ? { ...it, ...patch } : it)));

  const removeItem = (id) =>
    setItems((prev) => prev.filter((it) => it._id !== id));

  const handleSaveAll = async () => {
    if (!items.length) return;
    setSaving(true);
    setErr(null);

    const updated = [...items];
    let done = 0;

    for (let i = 0; i < updated.length; i++) {
      const it = updated[i];
      if (it.url) { done++; setProgress(`${done}/${updated.length}`); continue; }
      updateItem(it._id, { uploading: true });
      let url = null;
      let uploadError = null;
      try {
        url = await uploadToStorage(it.file, (msg) => { uploadError = msg; });
      } catch (e) {
        uploadError = e.message;
      }
      updated[i] = { ...it, url, uploaded: !!url, uploading: false, uploadError };
      updateItem(it._id, { url, uploaded: !!url, uploading: false, uploadError });
      done++;
      setProgress(`${done}/${updated.length}`);
    }

    const toInsert = updated
      .filter((it) => it.url && it.title && it.theme_id)
      .map((it) => ({
        title: it.title,
        url: it.url,
        price: Number(it.price),
        theme_id: it.theme_id,
        is_published: it.is_published,
      }));

    if (toInsert.length) {
      const { data: inserted, error } = await supabase
        .from('gallery_images')
        .insert(toInsert)
        .select('id, url');
      if (error) setErr(error.message);
      if (inserted) {
        for (const row of inserted) {
          const storagePath = row.url.split('/storage/v1/object/public/gallery/')[1];
          if (storagePath) triggerWebpConversion(storagePath, row.id);
        }
      }
    }

    setSaving(false);
    setProgress(null);
    onDone();
  };

  const ready = items.length > 0 && items.every((it) => it.title && it.theme_id);

  return (
    <Modal title="Bulk Upload" onClose={onClose} wide
      footer={
        <>
          <button className="pill" type="button" onClick={handleSaveAll} disabled={saving || !ready}>
            {saving ? (progress ? `Uploading ${progress}…` : 'Saving…') : `Upload ${items.length} image${items.length !== 1 ? 's' : ''}`}
          </button>
          <button className="ghost" type="button" onClick={onClose} disabled={saving}>Cancel</button>
        </>
      }
    >
      <div className="gm-form">
        {err && <div className="gm-error">{err}</div>}

        <div
          className={`gallery-dropzone bulk${uploading ? ' uploading' : ''}`}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif"
            style={{ display: 'none' }}
            onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span className="muted small">
            {uploading ? 'Reading files…' : 'Drop multiple images here, or click to select'}
          </span>
          <span className="muted small" style={{ opacity: 0.5 }}>JPG, PNG, WebP, GIF · max 10 MB each</span>
        </div>

        {items.length > 0 && (
          <div className="bulk-list">
            {items.map((it) => (
              <div key={it._id} className="bulk-item">
                <img src={it.previewUrl} alt="" className="bulk-thumb" />
                <div className="bulk-fields">
                  <input
                    value={it.title}
                    onChange={(e) => updateItem(it._id, { title: e.target.value })}
                    placeholder="Image title"
                    className="bulk-input"
                    disabled={saving}
                  />
                  <div className="bulk-row">
                    <select
                      value={it.theme_id}
                      onChange={(e) => updateItem(it._id, { theme_id: e.target.value })}
                      className="bulk-select"
                      disabled={saving}
                    >
                      <option value="">Theme…</option>
                      {themes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <input
                      type="number" min="1" value={it.price}
                      onChange={(e) => updateItem(it._id, { price: e.target.value })}
                      className="bulk-price"
                      disabled={saving}
                      title="Credits"
                    />
                    <label className="bulk-pub-label" title="Published">
                      <input type="checkbox" checked={it.is_published}
                        onChange={(e) => updateItem(it._id, { is_published: e.target.checked })}
                        disabled={saving} />
                      <span className="muted small">Pub</span>
                    </label>
                  </div>
                  {it.uploadError && <p className="gm-error" style={{ margin: 0, padding: '4px 0', fontSize: 12 }}>{it.uploadError}</p>}
                  {it.uploaded && <p style={{ margin: 0, fontSize: 12, color: 'var(--accent)' }}>Uploaded</p>}
                  {it.uploading && <p className="muted small" style={{ margin: 0 }}>Uploading…</p>}
                </div>
                <button
                  type="button" className="bulk-remove"
                  onClick={() => removeItem(it._id)}
                  disabled={saving}
                  aria-label="Remove"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
const AdminGalleryManager = () => {
  const { themes, loading: themesLoading, refetch: refetchThemes } = useThemes();
  const { images, loading: imagesLoading, refetch: refetchImages } = useAllGalleryImages();

  const [activeTheme, setActiveTheme] = useState(null);
  const [modal, setModal] = useState(null); // 'add-image' | 'edit-image' | 'add-theme' | 'edit-theme' | 'bulk'
  const [editTarget, setEditTarget] = useState(null);
  const [message, setMessage] = useState('');

  const filteredImages = activeTheme ? images.filter((img) => img.theme_id === activeTheme) : images;

  const flash = (msg) => { setMessage(msg); setTimeout(() => setMessage(''), 3000); };
  const closeModal = () => { setModal(null); setEditTarget(null); };

  // ── Image CRUD ──
  const handleSaveImage = async (form) => {
    const payload = {
      title: form.title,
      url: form.url,
      price: Number(form.price),
      theme_id: form.theme_id,
      is_published: form.is_published,
    };
    let error;
    if (form.id) {
      ({ error } = await supabase.from('gallery_images').update(payload).eq('id', form.id));
      if (error) { flash(`Error: ${error.message}`); return; }
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from('gallery_images')
        .insert(payload)
        .select('id, url')
        .maybeSingle();
      error = insertErr;
      if (!error && inserted) {
        const storagePath = inserted.url.split('/storage/v1/object/public/gallery/')[1];
        if (storagePath) triggerWebpConversion(storagePath, inserted.id);
      }
    }
    if (error) { flash(`Error: ${error.message}`); return; }
    flash(form.id ? 'Image updated' : 'Image added');
    await refetchImages();
    closeModal();
  };

  const handleDeleteImage = async (id) => {
    if (!window.confirm('Delete this image?')) return;
    const { error } = await supabase.from('gallery_images').delete().eq('id', id);
    if (error) flash(`Error: ${error.message}`);
    else { flash('Image deleted'); await refetchImages(); }
  };

  // ── Theme CRUD ──
  const handleSaveTheme = async (form) => {
    const payload = {
      name: form.name,
      slug: form.slug,
      sort_order: Number(form.sort_order),
      cover_url: form.cover_url || '',
    };
    let error;
    if (form.id) {
      ({ error } = await supabase.from('themes').update(payload).eq('id', form.id));
    } else {
      ({ error } = await supabase.from('themes').insert(payload));
    }
    if (error) { flash(`Error: ${error.message}`); return; }
    flash(form.id ? 'Theme updated' : 'Theme created');
    await refetchThemes();
    closeModal();
  };

  const handleDeleteTheme = async (id) => {
    if (!window.confirm('Delete this theme and all its images?')) return;
    const { error } = await supabase.from('themes').delete().eq('id', id);
    if (error) flash(`Error: ${error.message}`);
    else {
      flash('Theme deleted');
      if (activeTheme === id) setActiveTheme(null);
      await refetchThemes();
      await refetchImages();
    }
  };

  return (
    <>
      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Gallery</p>
            <h2>Manage themes &amp; images</h2>
            <p className="muted">Add, edit, or remove gallery images and their theme categories.</p>
          </div>
          <div className="section-actions" style={{ gap: 8 }}>
            <button className="ghost" type="button" onClick={() => { setEditTarget({ ...EMPTY_THEME }); setModal('add-theme'); }}>
              New theme
            </button>
            <button className="ghost" type="button" onClick={() => setModal('bulk')}>
              Bulk upload
            </button>
            <button className="pill" type="button" onClick={() => { setEditTarget({ ...EMPTY_IMAGE, theme_id: activeTheme || themes[0]?.id || '' }); setModal('add-image'); }}>
              Add image
            </button>
          </div>
        </div>

        {/* Theme filter tabs */}
        <div className="admin-theme-tabs" style={{ marginBottom: 16 }}>
          <button className={`admin-theme-tab${!activeTheme ? ' active' : ''}`} type="button" onClick={() => setActiveTheme(null)}>
            All ({images.length})
          </button>
          {themes.map((theme) => (
            <button
              key={theme.id}
              className={`admin-theme-tab${activeTheme === theme.id ? ' active' : ''}`}
              type="button"
              onClick={() => setActiveTheme(theme.id)}
            >
              {theme.name} ({images.filter((i) => i.theme_id === theme.id).length})
            </button>
          ))}
        </div>

        {/* Theme cards row */}
        {themes.length > 0 && (
          <div className="theme-card-row">
            {themes.map((theme) => (
              <div key={theme.id} className="theme-card">
                <div className="theme-card-thumb">
                  {theme.cover_url
                    ? <img src={theme.cover_url} alt={theme.name} />
                    : <span className="muted small" style={{ fontSize: 11 }}>No thumbnail</span>
                  }
                </div>
                <div className="theme-card-body">
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{theme.name}</span>
                  <span className="muted" style={{ fontSize: 11 }}>{images.filter((i) => i.theme_id === theme.id).length} images</span>
                </div>
                <div className="theme-card-actions">
                  <button className="ghost small" type="button"
                    onClick={() => { setEditTarget({ id: theme.id, name: theme.name, slug: theme.slug, sort_order: theme.sort_order, cover_url: theme.cover_url || '' }); setModal('edit-theme'); }}
                    style={{ fontSize: 12, padding: '3px 10px' }}>
                    Edit
                  </button>
                  <button className="ghost danger-btn small" type="button"
                    onClick={() => handleDeleteTheme(theme.id)}
                    style={{ fontSize: 12, padding: '3px 10px' }}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Image grid */}
        {imagesLoading ? (
          <p className="muted" style={{ textAlign: 'center', padding: 32 }}>Loading…</p>
        ) : filteredImages.length === 0 ? (
          <p className="muted" style={{ textAlign: 'center', padding: 32 }}>
            No images yet. Click "Add image" to get started.
          </p>
        ) : (
          <div className="admin-image-grid">
            {filteredImages.map((image) => (
              <div key={image.id} className="admin-image-card">
                <img src={image.webp_url || image.url} alt={image.title} loading="lazy" />
                <div className="admin-image-card-body">
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{image.title}</p>
                    <p className="muted small" style={{ margin: 0 }}>
                      {image.themes?.name} · {image.price} cr{!image.is_published && ' · draft'}
                    </p>
                  </div>
                  <div className="admin-image-card-actions">
                    <button className="ghost" type="button"
                      onClick={() => { setEditTarget({ id: image.id, title: image.title, url: image.url, price: image.price, theme_id: image.theme_id, is_published: image.is_published }); setModal('edit-image'); }}
                      style={{ fontSize: 13, padding: '4px 10px' }}>
                      Edit
                    </button>
                    <button className="ghost danger-btn" type="button"
                      onClick={() => handleDeleteImage(image.id)}
                      style={{ fontSize: 13, padding: '4px 10px' }}>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modals */}
      {(modal === 'add-image' || modal === 'edit-image') && editTarget && (
        <ImageModal initial={editTarget} themes={themes} onSave={handleSaveImage} onClose={closeModal} />
      )}
      {(modal === 'add-theme' || modal === 'edit-theme') && editTarget && (
        <ThemeModal initial={editTarget} onSave={handleSaveTheme} onClose={closeModal} />
      )}
      {modal === 'bulk' && (
        <BulkUploadModal themes={themes} onDone={async () => { await refetchImages(); closeModal(); flash('Images added'); }} onClose={closeModal} />
      )}

      {message && <div className="toast" role="status">{message}</div>}
    </>
  );
};

export default AdminGalleryManager;
