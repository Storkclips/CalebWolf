import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, proxyImageUrl } from '../../lib/supabase';
import MagazineBillingPanel from './MagazineBillingPanel';

export default function AdminMagazineManager() {
  const [magazines, setMagazines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadMagazines(); }, []);

  async function loadMagazines() {
    setLoading(true);
    const { data } = await supabase
      .from('magazines')
      .select('*')
      .order('updated_at', { ascending: false });
    setMagazines(data || []);
    setLoading(false);
  }

  async function updateStatus(id, status) {
    await supabase
      .from('magazines')
      .update({ status, updated_at: new Date().toISOString(), published_at: status === 'published' ? new Date().toISOString() : null })
      .eq('id', id);
    loadMagazines();
  }

  async function duplicateMagazine(mag) {
    const slug = `${mag.slug}-copy-${Date.now().toString(36)}`;
    await supabase.from('magazines').insert({
      title: `${mag.title} (Copy)`,
      slug,
      description: mag.description,
      cover_url: mag.cover_url,
      status: 'draft',
      digital_price: mag.digital_price,
      physical_price: mag.physical_price,
      subscription_price: mag.subscription_price,
      page_count: mag.page_count,
    });
    loadMagazines();
  }

  async function deleteMagazine(id) {
    if (!confirm('Delete this magazine permanently?')) return;
    await supabase.from('magazines').delete().eq('id', id);
    loadMagazines();
  }

  return (
    <section className="section magazine-admin-shell">
      <div className="section-head">
        <div>
          <p className="eyebrow">Publishing</p>
          <h2>Magazine studio</h2>
          <p className="muted">Build, preview, and release digital editions. Opens in the full Magazine Studio editor.</p>
        </div>
        <Link className="btn" to="/magazine-studio">New magazine</Link>
      </div>

      <div className="magazine-list">
        {loading && <div className="muted">Loading…</div>}
        {!loading && magazines.map((item) => (
          <div className="magazine-list-item magazine-list-item--with-actions" key={item.id}>
            <div className="magazine-list-item-main">
              {item.cover_url
                ? <img src={proxyImageUrl(item.cover_url, 120)} alt="" className="magazine-list-thumb" />
                : <div className="magazine-list-thumb magazine-list-thumb--placeholder">CW</div>}
              <span>
                <strong>{item.title}</strong>
                <small>
                  {item.page_count} pages · ${Number(item.digital_price).toFixed(2)} digital ·{' '}
                  {item.autosaved_at ? `autosaved ${new Date(item.autosaved_at).toLocaleDateString()}` : 'no autosave'}
                </small>
              </span>
            </div>
            <div className="magazine-list-actions">
              <em className={`magazine-status magazine-status--${item.status}`}>{item.status}</em>
              <Link className="ghost" to="/magazine-studio">Edit</Link>
              {item.status === 'published'
                ? <button className="ghost" type="button" onClick={() => updateStatus(item.id, 'draft')}>Unpublish</button>
                : <button className="ghost" type="button" onClick={() => updateStatus(item.id, 'published')}>Publish</button>}
              <button className="ghost" type="button" onClick={() => duplicateMagazine(item)}>Duplicate</button>
              <button className="ghost" type="button" onClick={() => deleteMagazine(item.id)}>Delete</button>
            </div>
          </div>
        ))}
        {!loading && !magazines.length && (
          <div className="home-empty-state">No magazines yet. Click "New magazine" to open Magazine Studio.</div>
        )}
      </div>

      <MagazineBillingPanel />
    </section>
  );
}
