import { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAdminCollections, useUnlockCodes, useCollectionImages } from '../../hooks/useAdminCollections';

const EMPTY_COLLECTION = {
  title: '', slug: '', description: '', category: '', cover_url: '',
  tags: [], price_per_image: 3, bulk_bundle_label: '', bulk_bundle_price: 0,
  is_selling: true, is_published: true, sort_order: 0,
};

function generateFilePath(file) {
  const ext = file.name.split('.').pop();
  return `collections/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

const AdminCollectionsPanel = () => {
  const { collections, loading, refetch } = useAdminCollections();
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [codeModal, setCodeModal] = useState(null);
  const [codeForm, setCodeForm] = useState({ code: '', max_uses: 0, is_active: true });
  const fileRef = useRef(null);

  const { codes, refetch: refetchCodes } = useUnlockCodes(selected);
  const { images: collImages, refetch: refetchCollImages } = useCollectionImages(selected);

  const [imgModal, setImgModal] = useState(null);
  const [imgForm, setImgForm] = useState({ title: '', url: '', price: 3, sort_order: 0, is_published: true });
  const imgFileRef = useRef(null);

  const flash = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const uploadCover = async (file) => {
    if (!file) return;
    setUploading(true);
    const path = generateFilePath(file);
    const { error } = await supabase.storage.from('gallery').upload(path, file, { cacheControl: '3600', upsert: false });
    setUploading(false);
    if (error) { flash(`Upload failed: ${error.message}`); return; }
    const { data: urlData } = supabase.storage.from('gallery').getPublicUrl(path);
    update('cover_url', urlData.publicUrl);
  };

  const uploadCollImg = async (file) => {
    if (!file) return;
    setUploading(true);
    const path = generateFilePath(file);
    const { error } = await supabase.storage.from('gallery').upload(path, file, { cacheControl: '3600', upsert: false });
    setUploading(false);
    if (error) { flash(`Upload failed: ${error.message}`); return; }
    const { data: urlData } = supabase.storage.from('gallery').getPublicUrl(path);
    setImgForm((prev) => ({ ...prev, url: urlData.publicUrl }));
    if (!imgForm.title) {
      const name = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
      setImgForm((prev) => ({ ...prev, title: name.charAt(0).toUpperCase() + name.slice(1) }));
    }
  };

  const addTag = () => {
    const val = tagInput.trim();
    if (val && !form.tags?.includes(val)) {
      update('tags', [...(form.tags || []), val]);
    }
    setTagInput('');
  };

  const removeTag = (tag) => update('tags', (form.tags || []).filter((t) => t !== tag));

  const openAdd = () => {
    setForm({ ...EMPTY_COLLECTION });
    setTagInput('');
    setModal('add');
  };

  const openEdit = (c) => {
    setForm({ ...c });
    setTagInput('');
    setModal('edit');
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      title: form.title, slug: form.slug, description: form.description,
      category: form.category, cover_url: form.cover_url, tags: form.tags || [],
      price_per_image: Number(form.price_per_image), bulk_bundle_label: form.bulk_bundle_label,
      bulk_bundle_price: Number(form.bulk_bundle_price), is_selling: form.is_selling,
      is_published: form.is_published, sort_order: Number(form.sort_order),
    };
    if (modal === 'add') {
      const { error } = await supabase.from('admin_collections').insert(payload);
      flash(error ? `Error: ${error.message}` : 'Collection created');
    } else {
      const { error } = await supabase.from('admin_collections').update(payload).eq('id', form.id);
      flash(error ? `Error: ${error.message}` : 'Collection updated');
    }
    setSaving(false);
    setModal(null);
    await refetch();
  };

  const toggleSelling = async (c) => {
    await supabase.from('admin_collections').update({ is_selling: !c.is_selling }).eq('id', c.id);
    flash(c.is_selling ? 'Collection paused' : 'Collection live');
    await refetch();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this collection and all its images/codes?')) return;
    await supabase.from('admin_collections').delete().eq('id', id);
    if (selected === id) setSelected(null);
    flash('Deleted');
    await refetch();
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return `CW-${code}`;
  };

  const openAddCode = (collId) => {
    setCodeForm({ code: generateCode(), max_uses: 0, is_active: true, collection_id: collId });
    setCodeModal('add');
  };

  const handleSaveCode = async () => {
    setSaving(true);
    if (codeModal === 'add') {
      const { error } = await supabase.from('unlock_codes').insert({
        code: codeForm.code, collection_id: codeForm.collection_id,
        max_uses: Number(codeForm.max_uses), is_active: codeForm.is_active,
      });
      flash(error ? `Error: ${error.message}` : 'Code created');
    } else {
      const { error } = await supabase.from('unlock_codes').update({
        code: codeForm.code, max_uses: Number(codeForm.max_uses), is_active: codeForm.is_active,
      }).eq('id', codeForm.id);
      flash(error ? `Error: ${error.message}` : 'Code updated');
    }
    setSaving(false);
    setCodeModal(null);
    await refetchCodes();
  };

  const deleteCode = async (id) => {
    if (!window.confirm('Delete this unlock code?')) return;
    await supabase.from('unlock_codes').delete().eq('id', id);
    flash('Code deleted');
    await refetchCodes();
  };

  const openAddImg = () => {
    setImgForm({ title: '', url: '', price: 3, sort_order: 0, is_published: true, collection_id: selected });
    setImgModal('add');
  };

  const openEditImg = (img) => {
    setImgForm({ ...img });
    setImgModal('edit');
  };

  const handleSaveImg = async () => {
    setSaving(true);
    const payload = {
      title: imgForm.title, url: imgForm.url, price: Number(imgForm.price),
      sort_order: Number(imgForm.sort_order), is_published: imgForm.is_published,
      collection_id: imgForm.collection_id || selected,
    };
    if (imgModal === 'add') {
      const { error } = await supabase.from('collection_images').insert(payload);
      flash(error ? `Error: ${error.message}` : 'Image added');
    } else {
      const { error } = await supabase.from('collection_images').update(payload).eq('id', imgForm.id);
      flash(error ? `Error: ${error.message}` : 'Image updated');
    }
    setSaving(false);
    setImgModal(null);
    await refetchCollImages();
  };

  const deleteImg = async (id) => {
    if (!window.confirm('Delete this image?')) return;
    await supabase.from('collection_images').delete().eq('id', id);
    flash('Image deleted');
    await refetchCollImages();
  };

  const selectedColl = collections.find((c) => c.id === selected);

  return (
    <>
      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Collections</p>
            <h2>Manage collections & unlock codes</h2>
            <p className="muted">Create collections, toggle selling, generate unlock codes for clients.</p>
          </div>
          <button className="pill" type="button" onClick={openAdd}>New collection</button>
        </div>

        {loading ? (
          <p className="muted" style={{ textAlign: 'center', padding: 32 }}>Loading...</p>
        ) : collections.length === 0 ? (
          <p className="muted" style={{ textAlign: 'center', padding: 32 }}>No collections yet.</p>
        ) : (
          <div className="admin-coll-list">
            {collections.map((c) => (
              <div key={c.id} className={`admin-coll-row${selected === c.id ? ' selected' : ''}`}>
                <button type="button" className="admin-coll-row-main" onClick={() => setSelected(selected === c.id ? null : c.id)}>
                  {c.cover_url && <img src={c.cover_url} alt="" className="admin-coll-thumb" />}
                  <div className="admin-coll-row-info">
                    <p className="admin-coll-title">{c.title}</p>
                    <p className="muted small">{c.category} &middot; {c.price_per_image} cr/img</p>
                  </div>
                  <div className="admin-coll-badges">
                    <span className={`admin-badge ${c.is_selling ? 'selling' : 'paused'}`}>
                      {c.is_selling ? 'Selling' : 'Paused'}
                    </span>
                    {!c.is_published && <span className="admin-badge draft">Draft</span>}
                  </div>
                </button>
                <div className="admin-coll-actions">
                  <button className="ghost small" type="button" onClick={() => toggleSelling(c)}>
                    {c.is_selling ? 'Pause sales' : 'Resume sales'}
                  </button>
                  <button className="ghost small" type="button" onClick={() => openEdit(c)}>Edit</button>
                  <button className="ghost danger-btn small" type="button" onClick={() => handleDelete(c.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {selected && selectedColl && (
          <div className="admin-coll-detail">
            <div className="admin-coll-detail-header">
              <h3>{selectedColl.title}</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="pill small" type="button" onClick={openAddImg}>Add image</button>
                <button className="ghost small" type="button" onClick={() => openAddCode(selected)}>
                  Generate unlock code
                </button>
              </div>
            </div>

            <div className="admin-coll-detail-section">
              <h4>Images ({collImages.length})</h4>
              {collImages.length === 0 ? (
                <p className="muted small">No images yet.</p>
              ) : (
                <div className="admin-image-grid">
                  {collImages.map((img) => (
                    <div key={img.id} className="admin-image-card">
                      <img src={img.url} alt={img.title} loading="lazy" />
                      <div className="admin-image-card-body">
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{img.title}</p>
                          <p className="muted small" style={{ margin: 0 }}>{img.price} credits{!img.is_published && ' (draft)'}</p>
                        </div>
                        <div className="admin-image-card-actions">
                          <button className="ghost" type="button" onClick={() => openEditImg(img)} style={{ fontSize: 13, padding: '4px 10px' }}>Edit</button>
                          <button className="ghost danger-btn" type="button" onClick={() => deleteImg(img.id)} style={{ fontSize: 13, padding: '4px 10px' }}>Remove</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="admin-coll-detail-section">
              <h4>Unlock Codes</h4>
              {codes.length === 0 ? (
                <p className="muted small">No codes yet.</p>
              ) : (
                <div className="admin-codes-list">
                  {codes.map((code) => (
                    <div key={code.id} className="admin-code-row">
                      <code className="admin-code-value">{code.code}</code>
                      <span className="muted small">
                        Used {code.times_used}{code.max_uses > 0 ? `/${code.max_uses}` : ''}
                      </span>
                      <span className={`admin-badge ${code.is_active ? 'selling' : 'paused'}`}>
                        {code.is_active ? 'Active' : 'Disabled'}
                      </span>
                      <button className="ghost danger-btn small" type="button" onClick={() => deleteCode(code.id)}>
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {modal && (
        <div className="admin-modal-backdrop" onClick={() => setModal(null)}>
          <div className="admin-modal wide" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{modal === 'add' ? 'New Collection' : 'Edit Collection'}</h3>
              <button className="ghost" type="button" onClick={() => setModal(null)}>Close</button>
            </div>
            <div className="admin-modal-form">
              <div className="admin-form-grid">
                <label>
                  Title
                  <input value={form.title} onChange={(e) => update('title', e.target.value)} />
                </label>
                <label>
                  Slug
                  <input value={form.slug} onChange={(e) => update('slug', e.target.value)} placeholder="my-collection" />
                </label>
                <label>
                  Category
                  <input value={form.category} onChange={(e) => update('category', e.target.value)} placeholder="Weddings" />
                </label>
                <label>
                  Sort order
                  <input type="number" value={form.sort_order} onChange={(e) => update('sort_order', e.target.value)} />
                </label>
              </div>
              <label>
                Description
                <textarea rows="3" value={form.description} onChange={(e) => update('description', e.target.value)} />
              </label>
              <label>
                Cover image
                <div className="upload-dropzone" onClick={() => fileRef.current?.click()}>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={(e) => { uploadCover(e.target.files?.[0]); e.target.value = ''; }} />
                  <p className="muted" style={{ margin: 0 }}>
                    {uploading ? 'Uploading...' : form.cover_url ? 'Click to replace' : 'Click to upload cover'}
                  </p>
                </div>
              </label>
              {form.cover_url && <img src={form.cover_url} alt="Cover" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 12, border: '1px solid var(--border)' }} />}
              <div className="admin-form-grid">
                <label>
                  Price per image (credits)
                  <input type="number" min="1" value={form.price_per_image} onChange={(e) => update('price_per_image', e.target.value)} />
                </label>
                <label>
                  Bundle label
                  <input value={form.bulk_bundle_label} onChange={(e) => update('bulk_bundle_label', e.target.value)} placeholder="Full gallery buyout" />
                </label>
                <label>
                  Bundle price (credits)
                  <input type="number" min="0" value={form.bulk_bundle_price} onChange={(e) => update('bulk_bundle_price', e.target.value)} />
                </label>
              </div>
              <label>
                Tags
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                    placeholder="Type and press Enter" style={{ flex: 1 }} />
                  <button className="ghost" type="button" onClick={addTag}>Add</button>
                </div>
              </label>
              {form.tags?.length > 0 && (
                <div className="chips">
                  {form.tags.map((tag) => (
                    <button key={tag} className="chip" type="button" onClick={() => removeTag(tag)}>{tag} ✕</button>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 20 }}>
                <label style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <input type="checkbox" checked={form.is_selling} onChange={(e) => update('is_selling', e.target.checked)} style={{ width: 'auto' }} />
                  Selling
                </label>
                <label style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <input type="checkbox" checked={form.is_published} onChange={(e) => update('is_published', e.target.checked)} style={{ width: 'auto' }} />
                  Published
                </label>
              </div>
            </div>
            <div className="admin-modal-actions">
              <button className="pill" type="button" onClick={handleSave} disabled={saving || !form.title || !form.slug}>
                {saving ? 'Saving...' : 'Save collection'}
              </button>
              <button className="ghost" type="button" onClick={() => setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {codeModal && (
        <div className="admin-modal-backdrop" onClick={() => setCodeModal(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{codeModal === 'add' ? 'Generate Unlock Code' : 'Edit Code'}</h3>
              <button className="ghost" type="button" onClick={() => setCodeModal(null)}>Close</button>
            </div>
            <div className="admin-modal-form">
              <label>
                Code
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={codeForm.code} onChange={(e) => setCodeForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))} style={{ flex: 1, fontFamily: 'monospace', letterSpacing: 2 }} />
                  <button className="ghost" type="button" onClick={() => setCodeForm((p) => ({ ...p, code: generateCode() }))}>Regenerate</button>
                </div>
              </label>
              <label>
                Max uses (0 = unlimited)
                <input type="number" min="0" value={codeForm.max_uses} onChange={(e) => setCodeForm((p) => ({ ...p, max_uses: e.target.value }))} />
              </label>
              <label style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" checked={codeForm.is_active} onChange={(e) => setCodeForm((p) => ({ ...p, is_active: e.target.checked }))} style={{ width: 'auto' }} />
                Active
              </label>
            </div>
            <div className="admin-modal-actions">
              <button className="pill" type="button" onClick={handleSaveCode} disabled={saving || !codeForm.code}>
                {saving ? 'Saving...' : 'Save code'}
              </button>
              <button className="ghost" type="button" onClick={() => setCodeModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {imgModal && (
        <div className="admin-modal-backdrop" onClick={() => setImgModal(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{imgModal === 'add' ? 'Add Image' : 'Edit Image'}</h3>
              <button className="ghost" type="button" onClick={() => setImgModal(null)}>Close</button>
            </div>
            <div className="admin-modal-form">
              <label>
                Upload image
                <div className="upload-dropzone" onClick={() => imgFileRef.current?.click()}>
                  <input ref={imgFileRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={(e) => { uploadCollImg(e.target.files?.[0]); e.target.value = ''; }} />
                  <p className="muted" style={{ margin: 0 }}>
                    {uploading ? 'Uploading...' : imgForm.url ? 'Click to replace' : 'Click to upload'}
                  </p>
                </div>
              </label>
              {imgForm.url && <img src={imgForm.url} alt="Preview" style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 12, border: '1px solid var(--border)' }} />}
              <label>
                Title
                <input value={imgForm.title} onChange={(e) => setImgForm((p) => ({ ...p, title: e.target.value }))} />
              </label>
              <label>
                Price (credits)
                <input type="number" min="1" value={imgForm.price} onChange={(e) => setImgForm((p) => ({ ...p, price: e.target.value }))} />
              </label>
              <label>
                Sort order
                <input type="number" value={imgForm.sort_order} onChange={(e) => setImgForm((p) => ({ ...p, sort_order: e.target.value }))} />
              </label>
              <label style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" checked={imgForm.is_published} onChange={(e) => setImgForm((p) => ({ ...p, is_published: e.target.checked }))} style={{ width: 'auto' }} />
                Published
              </label>
            </div>
            <div className="admin-modal-actions">
              <button className="pill" type="button" onClick={handleSaveImg} disabled={saving || !imgForm.title || !imgForm.url}>
                {saving ? 'Saving...' : 'Save image'}
              </button>
              <button className="ghost" type="button" onClick={() => setImgModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {message && <div className="toast" role="status">{message}</div>}
    </>
  );
};

export default AdminCollectionsPanel;
