import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import HeroGallery from '../components/HeroGallery';
import Layout from '../components/Layout';
import { getBlogPosts } from '../utils/blog';

const NEWS = [
  { id: 1, label: 'Award',       text: 'Named a finalist in the 2026 International Landscape Photographer of the Year', date: 'Mar 2026' },
  { id: 2, label: 'Exhibition',  text: '"Edge of Light" opens at the Reykjavik Arts Centre, April 12–June 30',          date: 'Apr 2026' },
  { id: 3, label: 'Publication', text: "Featured in National Geographic's annual nature photography issue",              date: 'Feb 2026' },
  { id: 4, label: 'Workshop',    text: 'Limited spots open for the July Faroe Islands field workshop',                   date: 'Jul 2026' },
];

const COLLECTIONS = [
  { id: 1, title: 'Extreme North',      count: 34, img: 'https://images.unsplash.com/photo-1531168756798-4b68c7bbc84f?w=800&q=80' },
  { id: 2, title: 'Desert Geometries',  count: 28, img: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=80' },
  { id: 3, title: 'Water & Stone',      count: 41, img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80' },
  { id: 4, title: 'Forest Silence',     count: 22, img: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80' },
  { id: 5, title: 'Storm & Calm',       count: 19, img: 'https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=800&q=80' },
  { id: 6, title: 'Golden Coasts',      count: 37, img: 'https://images.unsplash.com/photo-1473116763249-2faaef81ccda?w=800&q=80' },
];

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

export default function HomePage() {
  const [blogPosts, setBlogPosts] = useState([]);

  useEffect(() => {
    const posts = getBlogPosts();
    setBlogPosts(posts.filter(p => p.published).slice(0, 3));
  }, []);

  return (
    <Layout>
      <HeroGallery />

      {/* ── Shared styles ─────────────────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');

        /* Scrollbar */
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0c0c0c; }
        ::-webkit-scrollbar-thumb { background: #5a4a3a; border-radius: 2px; }

        /* Typography helpers */
        .cwp-section-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 10px; letter-spacing: 0.3em; text-transform: uppercase;
          color: #9a7f5f; margin-bottom: 8px;
        }
        .cwp-section-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(36px, 5vw, 64px); letter-spacing: 0.04em;
          color: #e8e0d5; line-height: 1;
        }

        /* Blog cards */
        .cwp-blog-card {
          background: #141414; border: 1px solid #222;
          overflow: hidden; transition: transform 0.3s, border-color 0.3s; cursor: pointer;
        }
        .cwp-blog-card:hover { transform: translateY(-4px); border-color: #5a4a3a; }
        .cwp-blog-img { width: 100%; height: 200px; object-fit: cover; display: block; transition: transform 0.5s; }
        .cwp-blog-card:hover .cwp-blog-img { transform: scale(1.04); }

        /* Tag pill */
        .cwp-tag {
          display: inline-block;
          font-family: 'DM Sans', sans-serif;
          font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase;
          color: #9a7f5f; border: 1px solid #5a4a3a; padding: 3px 10px; margin-bottom: 12px;
        }

        /* News ticker */
        .cwp-news-wrap { border-top: 1px solid #222; border-bottom: 1px solid #222; background: #101010; }
        .cwp-news-row { display: flex; gap: 40px; align-items: baseline; padding: 18px 0; border-bottom: 1px solid #1a1a1a; }
        .cwp-news-row:last-child { border-bottom: none; }
        .cwp-news-label { font-family: 'DM Sans', sans-serif; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #9a7f5f; min-width: 80px; flex-shrink: 0; }
        .cwp-news-text  { font-family: 'EB Garamond', serif; font-size: 16px; color: #c8c0b5; flex: 1; font-style: italic; }
        .cwp-news-date  { font-family: 'DM Sans', sans-serif; font-size: 11px; color: #4a4a4a; flex-shrink: 0; letter-spacing: 0.1em; }

        /* Collections grid */
        .cwp-coll-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; }
        @media (max-width: 900px) { .cwp-coll-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 600px) { .cwp-coll-grid { grid-template-columns: 1fr; } }

        .cwp-coll-item { position: relative; overflow: hidden; cursor: pointer; aspect-ratio: 4/3; }
        .cwp-coll-img  { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.6s ease; }
        .cwp-coll-item:hover .cwp-coll-img { transform: scale(1.06); }
        .cwp-coll-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(12,12,12,0.85) 0%, rgba(12,12,12,0.1) 50%); transition: background 0.3s; }
        .cwp-coll-item:hover .cwp-coll-overlay { background: linear-gradient(to top, rgba(12,12,12,0.9) 0%, rgba(12,12,12,0.3) 60%); }
        .cwp-coll-info  { position: absolute; bottom: 0; left: 0; padding: 20px 24px; }
        .cwp-coll-count { font-family: 'DM Sans', sans-serif; font-size: 11px; color: #9a7f5f; letter-spacing: 0.15em; margin-bottom: 4px; }
        .cwp-coll-name  { font-family: 'Bebas Neue', sans-serif; font-size: 26px; letter-spacing: 0.06em; color: #e8e0d5; }

        /* Outline button */
        .cwp-btn {
          display: inline-block;
          font-family: 'DM Sans', sans-serif;
          font-size: 11px; letter-spacing: 0.25em; text-transform: uppercase;
          border: 1px solid #5a4a3a; color: #c8b89a;
          padding: 12px 28px; text-decoration: none;
          transition: all 0.25s; background: transparent; cursor: pointer;
        }
        .cwp-btn:hover { background: #5a4a3a; color: #e8e0d5; }

        /* Divider */
        .cwp-divider { height: 1px; background: linear-gradient(to right, transparent, #333, transparent); }

        /* Footer grid */
        .cwp-footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 60px; }
        @media (max-width: 768px) { .cwp-footer-grid { grid-template-columns: 1fr; gap: 40px; } }

        /* Footer nav hover — handled via inline onMouse, but keep base colour */
        .cwp-footer-link { font-family: 'DM Sans', sans-serif; font-size: 13px; color: #5a5248; margin-bottom: 10px; cursor: pointer; transition: color 0.2s; }
        .cwp-footer-link:hover { color: #c8c0b5; }
      `}</style>

      {/* Sits in normal document flow, directly after the sticky HeroGallery */}
      <div style={{ position: 'relative', zIndex: 10, background: '#0c0c0c' }}>

        {/* ── QUOTE → JOURNAL ───────────────────────────────────────────── */}
        <section style={{
          padding: '110px 60px 0',
          textAlign: 'center',
          background: 'linear-gradient(to bottom, transparent 0%, #0c0c0c 12%)',
        }}>
          {/* Vertical rule bridging hero edge → quote */}
          <div style={{ width: 1, height: 56, background: 'linear-gradient(to bottom, transparent, #5a4a3a)', margin: '0 auto 52px' }} />

          <p style={{
            fontFamily: "'EB Garamond', serif",
            fontSize: 'clamp(28px, 3.5vw, 50px)',
            fontStyle: 'italic',
            color: '#c8b09a',
            lineHeight: 1.55,
            maxWidth: 860,
            margin: '0 auto 28px',
            fontWeight: 400,
          }}>
            "Every landscape holds its breath between moments. My work is the exhale."
          </p>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, letterSpacing: '0.38em', textTransform: 'uppercase', color: '#5a4a3a', marginBottom: 80 }}>
            — Caleb Wolf
          </div>

          {/* Journal cards flow directly out of the quote */}
          <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 40 }}>
              <div>
                <div className="cwp-section-label">Writing</div>
                <div className="cwp-section-title">From the Journal</div>
              </div>
              <Link to="/blog" className="cwp-btn" style={{ marginBottom: 6 }}>All Posts</Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
              {blogPosts.map(b => (
                <Link to={`/blog/${b.id}`} key={b.id} className="cwp-blog-card" style={{ textDecoration: 'none' }}>
                  <div style={{ overflow: 'hidden' }}>
                    <img src={b.images?.[0]?.url || 'https://images.unsplash.com/photo-1531168756798-4b68c7bbc84f?w=600&q=80'} alt={b.title} className="cwp-blog-img" />
                  </div>
                  <div style={{ padding: '28px 28px 32px' }}>
                    <span className="cwp-tag">{b.tag}</span>
                    <h3 style={{ fontFamily: "'EB Garamond', serif", fontSize: 22, fontWeight: 500, lineHeight: 1.35, color: '#e8e0d5', marginBottom: 14 }}>{b.title}</h3>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, lineHeight: 1.7, color: '#7a7265', marginBottom: 22 }}>{b.excerpt}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#5a5248' }}>{b.date}</span>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#9a7f5f' }}>{b.readTime || '5'} min read</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── NEWS TICKER ───────────────────────────────────────────────── */}
        <section style={{ padding: '60px 60px', background: '#0e0e0e', marginTop: 80 }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', paddingBottom: 20, borderBottom: '1px solid #1e1e1e' }}>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#9a7f5f', marginRight: 30, flexShrink: 0 }}>Latest News</div>
              <div style={{ height: 1, flex: 1, background: '#222' }} />
            </div>
            <div className="cwp-news-wrap">
              {NEWS.map(n => (
                <div key={n.id} className="cwp-news-row">
                  <span className="cwp-news-label">{n.label}</span>
                  <span className="cwp-news-text">{n.text}</span>
                  <span className="cwp-news-date">{n.date}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── DIVIDER ───────────────────────────────────────────────────── */}
        <div style={{ padding: '0 60px' }}>
          <div className="cwp-divider" style={{ maxWidth: 1200, margin: '0 auto' }} />
        </div>

        {/* ── COLLECTIONS ───────────────────────────────────────────────── */}
        <section style={{ padding: '80px 60px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 40 }}>
              <div>
                <div className="cwp-section-label">Browse</div>
                <div className="cwp-section-title">Collections</div>
              </div>
              <Link to="/collections" className="cwp-btn" style={{ marginBottom: 6 }}>View All Collections</Link>
            </div>
            <div className="cwp-coll-grid">
              {COLLECTIONS.map(c => (
                <Link to="/explore" key={c.id} className="cwp-coll-item" style={{ textDecoration: 'none' }}>
                  <img src={c.img} alt={c.title} className="cwp-coll-img" />
                  <div className="cwp-coll-overlay" />
                  <div className="cwp-coll-info">
                    <div className="cwp-coll-count">{c.count} photographs</div>
                    <div className="cwp-coll-name">{c.title}</div>
                  </div>
                </Link>
              ))}
            </div> 
          </div>
        </section>

        {/* ── FOOTER ────────────────────────────────────────────────────── */}
        <footer style={{ padding: '60px 60px 40px', borderTop: '1px solid #1a1a1a', background: '#080808' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div className="cwp-footer-grid" style={{ marginBottom: 60 }}>

              {/* Brand */}
              <div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: '0.1em', color: '#e8e0d5' }}>CALEB WOLF PHOTOGRAPHY</div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#5a5248', lineHeight: 1.8, maxWidth: 320, marginTop: 14 }}>
                  Landscape and wilderness photography from the world's most remote edges. Based in the Pacific Northwest, working globally.
                </p>
                <div style={{ display: 'flex', gap: 20, marginTop: 28 }}>
                  {['Instagram', '500px', 'Vero'].map(s => (
                    <a key={s} href="#" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(232,224,213,0.6)', textDecoration: 'none', transition: 'color 0.2s' }}>{s}</a>
                  ))}
                </div>
              </div>

              {/* Nav */}
              <div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#9a7f5f', marginBottom: 20 }}>Navigate</div>
                {['Portfolio', 'Collections', 'Journal', 'Workshops', 'About', 'Contact'].map(l => (
                  <div key={l} className="cwp-footer-link">{l}</div>
                ))}
              </div>

              {/* Newsletter */}
              <div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#9a7f5f', marginBottom: 20 }}>Newsletter</div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#5a5248', lineHeight: 1.7, marginBottom: 20 }}>
                  New work, journal entries, and workshop announcements — directly to your inbox.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    style={{ background: '#111', border: '1px solid #222', color: '#c8c0b5', padding: '11px 16px', fontFamily: "'DM Sans', sans-serif", fontSize: 13, outline: 'none', width: '100%' }}
                  />
                  <button className="cwp-btn" style={{ textAlign: 'center' }}>Subscribe</button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 24, borderTop: '1px solid #141414' }}>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#3a3530' }}>© 2026 Caleb Wolf Photography. All rights reserved.</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#3a3530' }}>All images protected under copyright.</div>
            </div>
          </div>
        </footer>
      </div>
    </Layout>
  );
}