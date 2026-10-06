import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getCoverDisplayUrl } from '../../lib/magazines';
import MagazineBillingPanel from './MagazineBillingPanel';

export default function AdminMagazineManager() {
  const [magazines, setMagazines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadMagazines(); }, []);

  async function loadMagazines() {
    setLoading(true);
    const { data } = await supabase
      .from('magazines')
      .select(`
        id, title, slug, description, cover_url, status,
        digital_price, physical_price, subscription_price,
        page_count, saved_at, autosaved_at, published_at, updated_at,
        magazine_promotions ( free_access, active )
      `)
      .order('updated_at', { ascending: false });
    setMagazines((data || []).map((m) => ({
      ...m,
      isFree: (m.magazine_promotions || []).some((p) => p.free_access && p.active),
    })));
    setLoading(false);
  }

  async function updateStatus(id, status) {
    await supabase
      .from('magazines')
      .update({ status, updated_at: new Date().toISOString(), published_at: status === 'published' ? new Date().toISOString() : null })
      .eq('id', id);
    loadMagazines();
  }

  async function toggleFree(mag) {
    // Free access is stored as an active free-access campaign row — the
    // same mechanism as the promotions system, so the public reader and
    // library pick it up without any price change.
    if (mag.isFree) {
      await supabase
        .from('magazine_promotions')
        .update({ active: false, ends_at: new Date().toISOString() })
        .eq('magazine_id', mag.id)
        .eq('free_access', true)
        .eq('active', true);
    } else {
      await supabase.from('magazine_promotions').insert({
        magazine_id: mag.id,
        name: `${mag.title} — free for everyone`,
        discount_percent: 0,
        free_access: true,
      });
    }
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
                ? <img src={getCoverDisplayUrl(item.cover_url, 120)} alt="" className="magazine-list-thumb" />
                : <div className="magazine-list-thumb magazine-list-thumb--placeholder">CW</div>}
              <span>
                <strong>{item.title}</strong>
                <small>
                  {item.page_count} pages · ${Number(item.digital_price).toFixed(2)} digital ·{' '}
                  {item.saved_at
                    ? `saved ${new Date(item.saved_at).toLocaleDateString()}`
                    : item.autosaved_at
                      ? `autosaved ${new Date(item.autosaved_at).toLocaleDateString()}`
                      : 'not saved'}
                </small>
              </span>
            </div>
            <div className="magazine-list-actions">
              <em className={`magazine-status magazine-status--${item.status}`}>{item.status}</em>
              <button
                className={`ghost${item.isFree ? ' magazine-free-toggle--on' : ''}`}
                type="button"
                onClick={() => toggleFree(item)}
              >
                {item.isFree ? 'Free for everyone ✓' : 'Mark as free'}
              </button>
              <Link className="ghost" to={`/magazine-studio/${item.id}`}>Edit</Link>
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
