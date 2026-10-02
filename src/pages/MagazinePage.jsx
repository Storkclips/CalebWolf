import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { supabase, proxyImageUrl } from '../lib/supabase';
import { useAuth } from '../store/AuthContext';

function PageArtwork({ page }) {
  return <div className="reader-page-art" style={{ background: page.background_color }}>{page.elements?.map((element) => <div key={element.id} className={`magazine-element magazine-element--${element.type}`} style={{ left: `${element.x}%`, top: `${element.y}%`, width: `${element.w}%`, height: `${element.h}%`, color: element.color, background: element.type === 'shape' ? element.fill : undefined, fontFamily: element.fontFamily, fontSize: `${element.fontSize}px`, fontWeight: element.weight, textAlign: element.align, borderRadius: `${element.radius}px` }}>{element.type === 'image' && element.src ? <img src={proxyImageUrl(element.src, 1400)} alt={element.alt || ''} style={{ objectFit: element.fit }} /> : element.type === 'text' ? element.text : null}</div>)}</div>;
}

export default function MagazinePage() {
  const { slug } = useParams();
  const { session } = useAuth();
  const [magazine, setMagazine] = useState(null);
  const [pages, setPages] = useState([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: item } = await supabase.from('magazines').select('*').eq('slug', slug).eq('status', 'published').maybeSingle();
      if (!item) { setLoading(false); return; }
      setMagazine(item);
      const { data: artwork } = await supabase.from('magazine_pages').select('*').eq('magazine_id', item.id).order('page_number');
      if (!artwork?.length) setLocked(item.digital_price > 0);
      else setPages(artwork);
      setLoading(false);
    }
    load();
  }, [slug, session]);

  const isCover = pageIndex === 0;
  const leftPage = pages[pageIndex];
  const rightPage = !isCover ? pages[pageIndex + 1] : null;
  const canNext = isCover ? pages.length > 1 : pageIndex + 2 < pages.length;

  if (loading) return <Layout><main className="magazine-public-page"><div className="magazine-reader-state">Loading magazine…</div></main></Layout>;
  if (!magazine) return <Layout><main className="magazine-public-page"><div className="magazine-reader-state"><h1>Magazine unavailable</h1><Link className="btn" to="/magazines">Back to magazines</Link></div></main></Layout>;

  return <Layout><main className="magazine-public-page"><header className="magazine-public-header"><div><p className="eyebrow">Digital edition</p><h1>{magazine.title}</h1><p>{magazine.description}</p></div><Link className="ghost" to="/magazines">All magazines</Link></header>{locked ? <section className="magazine-access-card"><p className="eyebrow">Private edition</p><h2>Unlock this magazine</h2><p>Purchase the digital edition or sign in with an account that has been granted access.</p><div><button className="btn" type="button">Purchase digital edition · ${Number(magazine.digital_price).toFixed(2)}</button>{!session && <Link className="ghost" to="/login">Sign in</Link>}</div></section> : <section className="magazine-reader"><div className={`magazine-spread${isCover ? ' magazine-spread--cover' : ''}`}>{leftPage && <PageArtwork page={leftPage} />}{rightPage && <PageArtwork page={rightPage} />}</div><div className="magazine-reader-controls"><button className="icon-button" type="button" disabled={pageIndex === 0} onClick={() => setPageIndex((current) => Math.max(0, current === 1 ? 0 : current - 2))}>←</button><span>{isCover ? 'Cover' : `${leftPage?.page_number || ''}–${rightPage?.page_number || ''}`} / {pages.length}</span><button className="icon-button" type="button" disabled={!canNext} onClick={() => setPageIndex((current) => isCover ? 1 : current + 2)}>→</button></div></section>}</main></Layout>;
}
