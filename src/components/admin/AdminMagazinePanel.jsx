import { useEffect, useMemo, useState } from 'react';
import { supabase, proxyImageUrl } from '../../lib/supabase';

const blankMagazine = {
  title: 'Untitled Magazine',
  slug: '',
  description: '',
  cover_url: '',
  status: 'draft',
  digital_price: 0,
  physical_price: 0,
  subscription_price: 0,
  page_count: 12,
};

const newElement = (type) => {
  if (type === 'image') return { id: crypto.randomUUID(), type, src: '', alt: '', x: 10, y: 10, w: 80, h: 45, fit: 'cover' };
  if (type === 'shape') return { id: crypto.randomUUID(), type, x: 12, y: 12, w: 76, h: 12, fill: '#e7c978', radius: 0 };
  return { id: crypto.randomUUID(), type: 'text', text: 'New headline', x: 12, y: 12, w: 76, h: 12, fontFamily: 'Georgia, serif', fontSize: 28, color: '#111111', align: 'left', weight: 700 };
};

const defaultPage = (pageNumber) => ({
  page_number: pageNumber,
  page_kind: pageNumber === 1 || pageNumber === 2 ? 'cover' : pageNumber === 3 || pageNumber === 4 ? 'inside-cover' : 'inner',
  background_color: '#ffffff',
  elements: [],
});

export default function AdminMagazinePanel() {
  const [magazines, setMagazines] = useState([]);
  const [magazine, setMagazine] = useState(null);
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(0);
  const [images, setImages] = useState([]);
  const [imageSearch, setImageSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const page = pages[selectedPage] || null;
  const visibleImages = useMemo(() => images.filter((image) => image.title.toLowerCase().includes(imageSearch.toLowerCase())), [images, imageSearch]);

  useEffect(() => {
    loadMagazines();
    supabase.from('gallery_images').select('id,title,url').eq('is_published', true).order('created_at', { ascending: false }).limit(80).then(({ data }) => setImages(data || []));
  }, []);

  async function loadMagazines() {
    const { data } = await supabase.from('magazines').select('*').order('updated_at', { ascending: false });
    setMagazines(data || []);
  }

  async function openMagazine(item) {
    setMagazine(item);
    const { data } = await supabase.from('magazine_pages').select('*').eq('magazine_id', item.id).order('page_number');
    const loaded = data || [];
    setPages(loaded.length ? loaded : Array.from({ length: item.page_count }, (_, index) => defaultPage(index + 1)));
    setSelectedPage(0);
    setNotice('');
  }

  function startNew() {
    setMagazine({ ...blankMagazine, id: null });
    setPages(Array.from({ length: blankMagazine.page_count }, (_, index) => defaultPage(index + 1)));
    setSelectedPage(0);
    setNotice('');
  }

  async function saveMagazine(nextStatus = magazine.status) {
    if (!magazine?.title.trim()) return;
    setSaving(true);
    const payload = {
      title: magazine.title.trim(),
      slug: magazine.slug.trim() || magazine.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      description: magazine.description,
      cover_url: magazine.cover_url,
      status: nextStatus,
      digital_price: Number(magazine.digital_price) || 0,
      physical_price: Number(magazine.physical_price) || 0,
      subscription_price: Number(magazine.subscription_price) || 0,
      page_count: pages.length,
      published_at: nextStatus === 'published' ? new Date().toISOString() : magazine.published_at,
      updated_at: new Date().toISOString(),
    };
    const result = magazine.id
      ? await supabase.from('magazines').update(payload).eq('id', magazine.id).select().maybeSingle()
      : await supabase.from('magazines').insert(payload).select().maybeSingle();
    if (result.error || !result.data) {
      setNotice('Could not save this magazine.');
      setSaving(false);
      return;
    }
    const saved = result.data;
    await supabase.from('magazine_pages').delete().eq('magazine_id', saved.id);
    await supabase.from('magazine_pages').insert(pages.map((item) => ({ ...item, magazine_id: saved.id })));
    setMagazine(saved);
    setNotice(nextStatus === 'published' ? 'Magazine published.' : 'Draft saved.');
    await loadMagazines();
    setSaving(false);
  }

  function updatePage(changes) {
    setPages((current) => current.map((item, index) => index === selectedPage ? { ...item, ...changes } : item));
  }

  function addElement(type) {
    updatePage({ elements: [...(page?.elements || []), newElement(type)] });
  }

  function updateElement(id, changes) {
    updatePage({ elements: page.elements.map((item) => item.id === id ? { ...item, ...changes } : item) });
  }

  function removeElement(id) {
    updatePage({ elements: page.elements.filter((item) => item.id !== id) });
  }

  function moveElement(event, element) {
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const start = { x: element.x, y: element.y };
    const move = (moveEvent) => {
      const rect = event.currentTarget.parentElement.getBoundingClientRect();
      updateElement(element.id, {
        x: Math.max(0, Math.min(100 - element.w, start.x + ((moveEvent.clientX - startX) / rect.width) * 100)),
        y: Math.max(0, Math.min(100 - element.h, start.y + ((moveEvent.clientY - startY) / rect.height) * 100)),
      });
    };
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
  }

  if (!magazine) {
    return (
      <section className="section magazine-admin-shell">
        <div className="section-head"><div><p className="eyebrow">Publishing</p><h2>Magazine studio</h2><p className="muted">Build, preview, and release digital editions from the perfect-bound 8.5 × 11 template.</p></div><button className="btn" type="button" onClick={startNew}>New magazine</button></div>
        <div className="magazine-list">{magazines.map((item) => <button type="button" className="magazine-list-item" key={item.id} onClick={() => openMagazine(item)}><span><strong>{item.title}</strong><small>{item.page_count} pages · ${Number(item.digital_price).toFixed(2)} digital</small></span><em className={`magazine-status magazine-status--${item.status}`}>{item.status}</em></button>)}</div>
        {!magazines.length && <div className="home-empty-state">No magazines yet. Start your first edition.</div>}
      </section>
    );
  }

  return (
    <section className="section magazine-admin-shell">
      <div className="magazine-studio-header"><div><button type="button" className="ghost" onClick={() => setMagazine(null)}>← All magazines</button><p className="eyebrow">Magazine studio</p><h2>{magazine.title}</h2></div><div className="magazine-studio-actions"><button className="ghost" type="button" disabled={saving} onClick={() => saveMagazine('draft')}>Save draft</button><button className="btn" type="button" disabled={saving} onClick={() => saveMagazine(magazine.status === 'published' ? 'hidden' : 'published')}>{magazine.status === 'published' ? 'Hide magazine' : 'Publish magazine'}</button></div></div>
      {notice && <div className="notice" role="status">{notice}</div>}
      <div className="magazine-settings-grid">
        <label className="ap-label">Title<input className="ap-input" value={magazine.title} onChange={(event) => setMagazine({ ...magazine, title: event.target.value })} /></label>
        <label className="ap-label">Slug<input className="ap-input" value={magazine.slug} onChange={(event) => setMagazine({ ...magazine, slug: event.target.value })} /></label>
        <label className="ap-label">Digital price<input className="ap-input" type="number" min="0" step="0.01" value={magazine.digital_price} onChange={(event) => setMagazine({ ...magazine, digital_price: event.target.value })} /></label>
        <label className="ap-label">Physical price<input className="ap-input" type="number" min="0" step="0.01" value={magazine.physical_price} onChange={(event) => setMagazine({ ...magazine, physical_price: event.target.value })} /></label>
        <label className="ap-label magazine-settings-wide">Description<textarea className="ap-textarea" value={magazine.description} onChange={(event) => setMagazine({ ...magazine, description: event.target.value })} /></label>
      </div>
      <div className="magazine-editor-layout">
        <aside className="magazine-page-strip">{pages.map((item, index) => <button type="button" key={item.page_number} className={`magazine-page-thumb${index === selectedPage ? ' active' : ''}`} onClick={() => setSelectedPage(index)}><span>{item.page_number}</span><div style={{ background: item.background_color }} /></button>)}</aside>
        <div className="magazine-workspace">
          <div className="magazine-toolbar"><button type="button" onClick={() => addElement('text')}>Text</button><button type="button" onClick={() => addElement('image')}>Image</button><button type="button" onClick={() => addElement('shape')}>Shape</button><span>Page {page?.page_number} · 0.12″ bleed · 0.20″ safety</span></div>
          <div className="magazine-canvas" style={{ background: page?.background_color }}>
            {page?.elements.map((element) => <div key={element.id} className={`magazine-element magazine-element--${element.type}`} onPointerDown={(event) => moveElement(event, element)} style={{ left: `${element.x}%`, top: `${element.y}%`, width: `${element.w}%`, height: `${element.h}%`, color: element.color, background: element.type === 'shape' ? element.fill : undefined, fontFamily: element.fontFamily, fontSize: `${element.fontSize}px`, fontWeight: element.weight, textAlign: element.align, borderRadius: `${element.radius}px` }}>{element.type === 'image' && element.src ? <img src={proxyImageUrl(element.src, 1200)} alt={element.alt} style={{ objectFit: element.fit }} /> : element.type === 'text' ? element.text : null}<button type="button" className="magazine-element-remove" onPointerDown={(event) => event.stopPropagation()} onClick={() => removeElement(element.id)} aria-label="Remove element">×</button></div>)}
          </div>
        </div>
        <aside className="magazine-inspector"><h3>Page design</h3><label className="ap-label">Background<input className="ap-input" type="color" value={page?.background_color || '#ffffff'} onChange={(event) => updatePage({ background_color: event.target.value })} /></label>{page?.elements.map((element) => <div className="magazine-inspector-card" key={element.id}><strong>{element.type}</strong>{element.type === 'text' && <><input className="ap-input" value={element.text} onChange={(event) => updateElement(element.id, { text: event.target.value })} /><select className="ap-input" value={element.align} onChange={(event) => updateElement(element.id, { align: event.target.value })}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></>}{element.type === 'image' && <><input className="ap-input" placeholder="Paste image URL or choose below" value={element.src} onChange={(event) => updateElement(element.id, { src: event.target.value })} /><input className="ap-input" placeholder="Alt text" value={element.alt} onChange={(event) => updateElement(element.id, { alt: event.target.value })} /></>}{element.type === 'shape' && <input className="ap-input" type="color" value={element.fill} onChange={(event) => updateElement(element.id, { fill: event.target.value })} />}<div className="magazine-size-row"><label>X<input className="ap-input" type="number" value={Math.round(element.x)} onChange={(event) => updateElement(element.id, { x: Number(event.target.value) })} /></label><label>Y<input className="ap-input" type="number" value={Math.round(element.y)} onChange={(event) => updateElement(element.id, { y: Number(event.target.value) })} /></label><label>W<input className="ap-input" type="number" value={Math.round(element.w)} onChange={(event) => updateElement(element.id, { w: Number(event.target.value) })} /></label><label>H<input className="ap-input" type="number" value={Math.round(element.h)} onChange={(event) => updateElement(element.id, { h: Number(event.target.value) })} /></label></div></div>)}<h3>Image library</h3><input className="ap-input" placeholder="Search images" value={imageSearch} onChange={(event) => setImageSearch(event.target.value)} /><div className="magazine-image-library">{visibleImages.slice(0, 12).map((image) => <button type="button" key={image.id} onClick={() => { const target = page?.elements.find((item) => item.type === 'image' && !item.src); if (target) updateElement(target.id, { src: image.url, alt: image.title }); else { const item = newElement('image'); updatePage({ elements: [...page.elements, { ...item, src: image.url, alt: image.title }] }); } }}><img src={proxyImageUrl(image.url, 240)} alt={image.title} /></button>)}</div></aside>
      </div>
    </section>
  );
}
