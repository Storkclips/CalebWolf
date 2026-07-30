import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const escapeHtml = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const ImagePickerModal = ({ onInsert, onClose }) => {
  const [tab, setTab] = useState('gallery');
  const [galleryImages, setGalleryImages] = useState([]);
  const [blogImages, setBlogImages] = useState([]);
  const [blogPosts, setBlogPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPost, setSelectedPost] = useState('');
  const [inserting, setInserting] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [{ data: gallery }, { data: blogImgs }, { data: posts }] = await Promise.all([
        supabase.from('gallery_images').select('id, title, url, alt_text').order('created_at', { ascending: false }).limit(200),
        supabase.from('blog_images').select('id, post_id, title, url, alt_text, caption').order('sort_order').limit(500),
        supabase.from('blog_posts').select('id, title, published, scheduled_at').order('created_at', { ascending: false }),
      ]);
      setGalleryImages(gallery || []);
      setBlogImages(blogImgs || []);
      setBlogPosts(posts || []);
      setLoading(false);
    };
    load();
  }, []);

  const filteredGallery = galleryImages.filter((img) =>
    (img.title || '').toLowerCase().includes(search.toLowerCase())
  );

  const filteredBlogImages = blogImages.filter((img) => {
    if (selectedPost && img.post_id !== selectedPost) return false;
    return (img.title || '').toLowerCase().includes(search.toLowerCase());
  });

  const handleInsert = (img) => {
    setInserting(img.id);
    const alt = escapeHtml(img.alt_text || img.title || '');
    const caption = escapeHtml(img.caption || img.title || '');
    const html = `<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;"><tr><td style="padding:0;">
      <img src="${img.url}" alt="${alt}" style="width:100%;max-width:560px;border-radius:12px;display:block;" />
      ${caption ? `<p style="margin:8px 0 0;font-size:13px;color:#888;font-style:italic;">${caption}</p>` : ''}
    </td></tr></table>`;
    onInsert(html);
    setInserting(null);
  };

  const blogPostsById = Object.fromEntries(blogPosts.map((p) => [p.id, p]));

  return (
    <div className="adm-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-modal adm-modal-wide">
        <div className="adm-modal-header">
          <h3>Insert Image</h3>
          <button className="adm-modal-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="adm-modal-body">
          <div className="rte-img-tabs">
            <button className={`rte-img-tab${tab === 'gallery' ? ' active' : ''}`} onClick={() => setTab('gallery')}>
              Gallery Images
            </button>
            <button className={`rte-img-tab${tab === 'blog' ? ' active' : ''}`} onClick={() => setTab('blog')}>
              Blog Images
            </button>
          </div>

          <div className="rte-img-controls">
            <input
              className="rte-img-search"
              type="search"
              placeholder="Search by title…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {tab === 'blog' && (
              <select
                className="rte-img-select"
                value={selectedPost}
                onChange={(e) => setSelectedPost(e.target.value)}
              >
                <option value="">All blog posts</option>
                {blogPosts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}{p.published ? '' : ' (draft)'}
                  </option>
                ))}
              </select>
            )}
          </div>

          {loading ? (
            <p className="muted" style={{ padding: 24, textAlign: 'center' }}>Loading images…</p>
          ) : (
            <div className="rte-img-grid">
              {tab === 'gallery' && (
                filteredGallery.length === 0 ? (
                  <p className="muted" style={{ padding: 24, textAlign: 'center' }}>No gallery images found.</p>
                ) : (
                  filteredGallery.map((img) => (
                    <button
                      key={img.id}
                      className="rte-img-card"
                      onClick={() => handleInsert(img)}
                      disabled={inserting === img.id}
                    >
                      <div className="rte-img-thumb">
                        <img src={img.url} alt={img.title} loading="lazy" />
                      </div>
                      <span className="rte-img-name">{img.title || 'Untitled'}</span>
                      {inserting === img.id && <span className="rte-img-inserted">Inserted</span>}
                    </button>
                  ))
                )
              )}
              {tab === 'blog' && (
                filteredBlogImages.length === 0 ? (
                  <p className="muted" style={{ padding: 24, textAlign: 'center' }}>No blog images found.</p>
                ) : (
                  filteredBlogImages.map((img) => (
                    <button
                      key={img.id}
                      className="rte-img-card"
                      onClick={() => handleInsert(img)}
                      disabled={inserting === img.id}
                    >
                      <div className="rte-img-thumb">
                        <img src={img.url} alt={img.title} loading="lazy" />
                      </div>
                      <span className="rte-img-name">{img.title || 'Untitled'}</span>
                      <span className="rte-img-source">
                        {blogPostsById[img.post_id]?.title || 'Unknown post'}
                      </span>
                      {inserting === img.id && <span className="rte-img-inserted">Inserted</span>}
                    </button>
                  ))
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImagePickerModal;
