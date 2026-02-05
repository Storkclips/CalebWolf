import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useThemes, useAllGalleryImages } from '../hooks/useGallery';

const EMPTY_IMAGE = { title: '', url: '', price: 3, theme_id: '', is_published: true };
const EMPTY_THEME = { name: '', slug: '', sort_order: 0 };

function generateFilePath(file) {
  const ext = file.name.split('.').pop();
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `images/${ts}-${rand}.${ext}`;
}

const AdminGalleryManager = () => {
  const { themes, loading: themesLoading, refetch: refetchThemes } = useThemes();
  const { images, loading: imagesLoading, refetch: refetchImages } = useAllGalleryImages();

  const [activeTheme, setActiveTheme] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const filteredImages = activeTheme
    ? images.filter((img) => img.theme_id === activeTheme)
    : images;

  const flash = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const uploadFile = async (file) => {
    if (!file) return null;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      flash('Only JPG, PNG, WebP, and GIF files are allowed');
      return null;
    }
    if (file.size > 10 * 1024 * 1024) {
      flash('File must be under 10 MB');
      return null;
    }
    setUploading(true);
    const path = generateFilePath(file);
    const { error } = await supabase.storage.from('gallery').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    setUploading(false);
    if (error) {
      flash(`Upload failed: ${error.message}`);
      return null;
    }
    const { data: urlData } = supabase.storage.from('gallery').getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleFileSelect = async (file) => {
    const url = await uploadFile(file);
    if (url) {
      updateForm('url', url);
      if (!form.title) {
        const name = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
        updateForm('title', name.charAt(0).toUpperCase() + name.slice(1));
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const openAddImage = () => {
    setForm({ ...EMPTY_IMAGE, theme_id: activeTheme || themes[0]?.id || '' });
    setModal('add-image');
  };

  const openEditImage = (image) => {
    setForm({
      id: image.id,
      title: image.title,
      url: image.url,
      price: image.price,
      theme_id: image.theme_id,
      is_published: image.is_published,
    });
    setModal('edit-image');
  };

  const openAddTheme = () => {
    setForm({ ...EMPTY_THEME });
    setModal('add-theme');
  };

  const openEditTheme = (theme) => {
    setForm({ id: theme.id, name: theme.name, slug: theme.slug, sort_order: theme.sort_order });
    setModal('edit-theme');
  };

  const handleSaveImage = async () => {
    setSaving(true);
    if (modal === 'add-image') {
      const { error } = await supabase.from('gallery_images').insert({
        title: form.title,
        url: form.url,
        price: Number(form.price),
        theme_id: form.theme_id,
        is_published: form.is_published,
      });
      if (error) {
        flash(`Error: ${error.message}`);
      } else {
        flash('Image added');
        await refetchImages();
      }
    } else {
      const { error } = await supabase
        .from('gallery_images')
        .update({
          title: form.title,
          url: form.url,
          price: Number(form.price),
          theme_id: form.theme_id,
          is_published: form.is_published,
        })
        .eq('id', form.id);
      if (error) {
        flash(`Error: ${error.message}`);
      } else {
        flash('Image updated');
        await refetchImages();
      }
    }
    setSaving(false);
    setModal(null);
  };

  const handleDeleteImage = async (id) => {
    if (!window.confirm('Delete this image?')) return;
    const { error } = await supabase.from('gallery_images').delete().eq('id', id);
    if (error) {
      flash(`Error: ${error.message}`);
    } else {
      flash('Image deleted');
      await refetchImages();
    }
  };

  const handleSaveTheme = async () => {
    setSaving(true);
    if (modal === 'add-theme') {
      const { error } = await supabase.from('themes').insert({
        name: form.name,
        slug: form.slug,
        sort_order: Number(form.sort_order),
      });
      if (error) {
        flash(`Error: ${error.message}`);
      } else {
        flash('Theme added');
        await refetchThemes();
      }
    } else {
      const { error } = await supabase
        .from('themes')
        .update({
          name: form.name,
          slug: form.slug,
          sort_order: Number(form.sort_order),
        })
        .eq('id', form.id);
      if (error) {
        flash(`Error: ${error.message}`);
      } else {
        flash('Theme updated');
        await refetchThemes();
      }
    }
    setSaving(false);
    setModal(null);
  };

  const handleDeleteTheme = async (id) => {
    if (!window.confirm('Delete this theme and all its images?')) return;
    const { error } = await supabase.from('themes').delete().eq('id', id);
    if (error) {
      flash(`Error: ${error.message}`);
    } else {
      flash('Theme deleted');
      if (activeTheme === id) setActiveTheme(null);
      await refetchThemes();
      await refetchImages();
    }
  };

  const updateForm = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const selectStyle = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: 12,
    color: 'var(--text)',
    fontSize: 14,
  };

  return (
    <>
      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Gallery</p>
            <h2>Manage themes & images</h2>
            <p className="muted">Add, edit, or remove gallery images and their theme categories.</p>
          </div>
          <div className="section-actions">
            <button className="ghost" type="button" onClick={openAddTheme}>
              New theme
            </button>
            <button className="pill" type="button" onClick={openAddImage}>
              Add image
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 18 }}>
          <div className="admin-theme-tabs">
            <button
              className={`admin-theme-tab${!activeTheme ? ' active' : ''}`}
              type="button"
              onClick={() => setActiveTheme(null)}
            >
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

          {themes.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {themes.map((theme) => (
                <div key={theme.id} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <span className="tag">{theme.name}</span>
                  <button
                    className="ghost small"
                    type="button"
                    onClick={() => openEditTheme(theme)}
                    style={{ fontSize: 12, padding: '4px 8px' }}
                  >
                    Edit
                  </button>
                  <button
                    className="ghost danger-btn small"
                    type="button"
                    onClick={() => handleDeleteTheme(theme.id)}
                    style={{ fontSize: 12, padding: '4px 8px' }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}

          {imagesLoading ? (
            <p className="muted" style={{ textAlign: 'center', padding: 32 }}>Loading...</p>
          ) : filteredImages.length === 0 ? (
            <p className="muted" style={{ textAlign: 'center', padding: 32 }}>
              No images yet. Click "Add image" to get started.
            </p>
          ) : (
            <div className="admin-image-grid">
              {filteredImages.map((image) => (
                <div key={image.id} className="admin-image-card">
                  <img src={image.url} alt={image.title} loading="lazy" />
                  <div className="admin-image-card-body">
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{image.title}</p>
                      <p className="muted small" style={{ margin: 0 }}>
                        {image.themes?.name} &middot; {image.price} credits
                        {!image.is_published && ' (draft)'}
                      </p>
                    </div>
                    <div className="admin-image-card-actions">
                      <button
                        className="ghost"
                        type="button"
                        onClick={() => openEditImage(image)}
                        style={{ fontSize: 13, padding: '4px 10px' }}
                      >
                        Edit
                      </button>
                      <button
                        className="ghost danger-btn"
                        type="button"
                        onClick={() => handleDeleteImage(image.id)}
                        style={{ fontSize: 13, padding: '4px 10px' }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {modal && (
        <div className="admin-modal-backdrop" onClick={() => setModal(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            {(modal === 'add-image' || modal === 'edit-image') && (
              <>
                <div className="admin-modal-header">
                  <h3>{modal === 'add-image' ? 'Add Image' : 'Edit Image'}</h3>
                  <button className="ghost" type="button" onClick={() => setModal(null)}>
                    Close
                  </button>
                </div>
                <div className="admin-modal-form">
                  <label>
                    Upload image
                    <div
                      className={`upload-dropzone${dragOver ? ' active' : ''}${uploading ? ' uploading' : ''}`}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileSelect(file);
                          e.target.value = '';
                        }}
                      />
                      {uploading ? (
                        <p className="muted" style={{ margin: 0 }}>Uploading...</p>
                      ) : form.url ? (
                        <p className="muted" style={{ margin: 0 }}>
                          Image uploaded -- click or drop to replace
                        </p>
                      ) : (
                        <p className="muted" style={{ margin: 0 }}>
                          Drag & drop an image here, or click to browse
                        </p>
                      )}
                      <p className="muted small" style={{ margin: 0 }}>
                        JPG, PNG, WebP, GIF up to 10 MB
                      </p>
                    </div>
                  </label>
                  {form.url && (
                    <img
                      src={form.url}
                      alt="Preview"
                      style={{
                        width: '100%',
                        height: 200,
                        objectFit: 'cover',
                        borderRadius: 12,
                        border: '1px solid var(--border)',
                      }}
                    />
                  )}
                  <label>
                    Title
                    <input
                      value={form.title}
                      onChange={(e) => updateForm('title', e.target.value)}
                      placeholder="Golden Hour Portrait"
                    />
                  </label>
                  <label>
                    Theme
                    <select
                      value={form.theme_id}
                      onChange={(e) => updateForm('theme_id', e.target.value)}
                      style={selectStyle}
                    >
                      <option value="">Select theme</option>
                      {themes.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Price (credits)
                    <input
                      type="number"
                      min="1"
                      value={form.price}
                      onChange={(e) => updateForm('price', e.target.value)}
                    />
                  </label>
                  <label style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <input
                      type="checkbox"
                      checked={form.is_published}
                      onChange={(e) => updateForm('is_published', e.target.checked)}
                      style={{ width: 'auto' }}
                    />
                    Published
                  </label>
                </div>
                <div className="admin-modal-actions">
                  <button
                    className="pill"
                    type="button"
                    onClick={handleSaveImage}
                    disabled={saving || uploading || !form.title || !form.url || !form.theme_id}
                  >
                    {saving ? 'Saving...' : 'Save image'}
                  </button>
                  <button className="ghost" type="button" onClick={() => setModal(null)}>
                    Cancel
                  </button>
                </div>
              </>
            )}

            {(modal === 'add-theme' || modal === 'edit-theme') && (
              <>
                <div className="admin-modal-header">
                  <h3>{modal === 'add-theme' ? 'Add Theme' : 'Edit Theme'}</h3>
                  <button className="ghost" type="button" onClick={() => setModal(null)}>
                    Close
                  </button>
                </div>
                <div className="admin-modal-form">
                  <label>
                    Name
                    <input
                      value={form.name}
                      onChange={(e) => updateForm('name', e.target.value)}
                      placeholder="Weddings"
                    />
                  </label>
                  <label>
                    Slug
                    <input
                      value={form.slug}
                      onChange={(e) => updateForm('slug', e.target.value)}
                      placeholder="weddings"
                    />
                  </label>
                  <label>
                    Sort order
                    <input
                      type="number"
                      value={form.sort_order}
                      onChange={(e) => updateForm('sort_order', e.target.value)}
                    />
                  </label>
                </div>
                <div className="admin-modal-actions">
                  <button
                    className="pill"
                    type="button"
                    onClick={handleSaveTheme}
                    disabled={saving || !form.name || !form.slug}
                  >
                    {saving ? 'Saving...' : 'Save theme'}
                  </button>
                  <button className="ghost" type="button" onClick={() => setModal(null)}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {message && <div className="toast" role="status">{message}</div>}
    </>
  );
};

export default AdminGalleryManager;
