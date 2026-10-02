import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { supabase, proxyImageUrl } from '../lib/supabase';

export default function MagazinesPage() {
  const [magazines, setMagazines] = useState([]);
  useEffect(() => { supabase.from('magazines').select('*').eq('status', 'published').order('published_at', { ascending: false }).then(({ data }) => setMagazines(data || [])); }, []);
  return <Layout><main className="magazine-public-page"><header className="magazine-public-header"><div><p className="eyebrow">The magazine</p><h1>Field Notes</h1><p>Limited digital editions of landscapes, stories, and photographs from the road.</p></div></header><section className="magazine-catalog">{magazines.map((magazine) => <Link className="magazine-catalog-card" to={`/magazines/${magazine.slug}`} key={magazine.id}>{magazine.cover_url ? <img src={proxyImageUrl(magazine.cover_url, 900)} alt={magazine.title} /> : <div className="magazine-catalog-placeholder">CW</div>}<div><p className="eyebrow">Edition</p><h2>{magazine.title}</h2><p>{magazine.description}</p><strong>{Number(magazine.digital_price) ? `$${Number(magazine.digital_price).toFixed(2)} digital` : 'Read free online'}</strong></div></Link>)}</section>{!magazines.length && <div className="magazine-reader-state">The next edition is being prepared.</div>}<section className="magazine-subscribe-card"><p className="eyebrow">Stay close to the work</p><h2>Subscribe to the magazine</h2><p>Get first access to new editions, print releases, and studio notes.</p><button className="btn" type="button">Join the magazine list</button></section></main></Layout>;
}
