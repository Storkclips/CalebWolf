import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

function generateFilePath(file) {
  const ext = file.name.split('.').pop();
  return `hero/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

const AdminHeroPanel = () => {
  const [hero, setHero] = useState(null);
  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    image_url: '',
    cta_text: 'Explore Gallery',
    cta_link: '/collections',
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    loadHero();
  }, []);

  const loadHero = async () => {
    const { data } = await supabase
      .from('hero_settings')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();
    if (data) {
      setHero(data);
      setForm(data);
    }
  };

  const flash = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const uploadImage = async (file) => {
    if (!file) return;
    setUploading(true);
    const path = generateFilePath(file);
    const { error } = await supabase.storage.from('gallery').upload(path, file, { cacheControl: '3600', upsert: false });
    setUploading(false);
    if (error) {
      flash(`Upload failed: ${error.message}`);
      return;
    }
    const { data: urlData } = supabase.storage.from('gallery').getPublicUrl(path);
    update('image_url', urlData.publicUrl);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      title: form.title,
      subtitle: form.subtitle,
      image_url: form.image_url,
      cta_text: form.cta_text,
      cta_link: form.cta_link,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    };

    if (hero) {
      const { error } = await supabase
        .from('hero_settings')
        .update(payload)
        .eq('id', hero.id);
      flash(error ? `Error: ${error.message}` : 'Hero banner updated');
    } else {
      const { error } = await supabase
        .from('hero_settings')
        .insert(payload);
      flash(error ? `Error: ${error.message}` : 'Hero banner created');
    }

    setSaving(false);
    await loadHero();
  };

  return (
    <>
      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Homepage</p>
            <h2>Hero Banner</h2>
            <p className="muted">Manage the hero banner on the homepage</p>
          </div>
        </div>

        <div className="admin-modal-form" style={{ maxWidth: 800 }}>
          <label>
            Title
            <input
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="Caleb Wolf Photography"
            />
          </label>

          <label>
            Subtitle
            <input
              value={form.subtitle}
              onChange={(e) => update('subtitle', e.target.value)}
              placeholder="Capturing moments that last forever"
            />
          </label>

          <label>
            Hero Image
            <div className="upload-dropzone" onClick={() => fileRef.current?.click()}>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  uploadImage(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              <p className="muted" style={{ margin: 0 }}>
                {uploading ? 'Uploading...' : form.image_url ? 'Click to replace image' : 'Click to upload hero image'}
              </p>
            </div>
          </label>

          {form.image_url && (
            <div style={{ marginBottom: 24 }}>
              <img
                src={form.image_url}
                alt="Hero preview"
                style={{
                  width: '100%',
                  height: 300,
                  objectFit: 'cover',
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                }}
              />
            </div>
          )}

          <div className="admin-form-grid">
            <label>
              Button Text
              <input
                value={form.cta_text}
                onChange={(e) => update('cta_text', e.target.value)}
                placeholder="Explore Gallery"
              />
            </label>

            <label>
              Button Link
              <input
                value={form.cta_link}
                onChange={(e) => update('cta_link', e.target.value)}
                placeholder="/collections"
              />
            </label>
          </div>

          <label style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => update('is_active', e.target.checked)}
              style={{ width: 'auto' }}
            />
            Active
          </label>

          <button
            className="pill"
            type="button"
            onClick={handleSave}
            disabled={saving || !form.title || !form.image_url}
          >
            {saving ? 'Saving...' : 'Save Hero Banner'}
          </button>
        </div>
      </section>

      {message && <div className="toast" role="status">{message}</div>}
    </>
  );
};

export default AdminHeroPanel;
