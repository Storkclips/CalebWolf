import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useThemes } from '../hooks/useGallery';
import { getBlogPosts } from '../utils/blog';

export default function HomePage() {
  const [heroData, setHeroData] = useState(null);
  const [blogPosts, setBlogPosts] = useState([]);
  const { themes } = useThemes();

  useEffect(() => {
    const loadHero = async () => {
      const { data } = await supabase
        .from('hero_settings')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();
      setHeroData(data);
    };
    loadHero();
  }, []);

  useEffect(() => {
    const loadPosts = async () => {
      const posts = await getBlogPosts();
      setBlogPosts(posts.slice(0, 3));
    };
    loadPosts();
  }, []);

  const featuredThemes = themes.filter(t => t.is_published).slice(0, 6);

  return (
    <Layout className="home-page">
      {heroData && (
        <section className="hero-banner">
          <div className="hero-banner-image" style={{ backgroundImage: `url(${heroData.image_url})` }} />
          <div className="hero-banner-overlay" />
          <div className="hero-banner-content">
            <h1 className="hero-banner-title">{heroData.title}</h1>
            <p className="hero-banner-subtitle">{heroData.subtitle}</p>
            <Link to={heroData.cta_link} className="hero-banner-cta">
              {heroData.cta_text}
            </Link>
          </div>
        </section>
      )}

      <section className="home-section">
        <div className="section-header">
          <div>
            <p className="eyebrow">Explore</p>
            <h2>Collections by Theme</h2>
          </div>
          <Link to="/collections" className="ghost">
            View all
          </Link>
        </div>
        <div className="home-themes-grid">
          {featuredThemes.map((theme) => (
            <Link key={theme.id} to={`/collections/${theme.slug}`} className="home-theme-card">
              <div className="home-theme-image" style={{ backgroundImage: `url(${theme.cover_url})` }} />
              <div className="home-theme-overlay" />
              <div className="home-theme-info">
                <h3>{theme.name}</h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {blogPosts.length > 0 && (
        <section className="home-section">
          <div className="section-header">
            <div>
              <p className="eyebrow">Journal</p>
              <h2>Latest Posts</h2>
            </div>
            <Link to="/blog" className="ghost">
              View all
            </Link>
          </div>
          <div className="home-blog-grid">
            {blogPosts.map((post) => (
              <Link key={post.id} to={`/blog/${post.id}`} className="home-blog-card">
                <div className="home-blog-image" style={{ backgroundImage: `url(${post.images?.[0]?.url || 'https://images.unsplash.com/photo-1531168756798-4b68c7bbc84f?w=600&q=80'})` }} />
                <div className="home-blog-body">
                  <span className="tag">{post.tag}</span>
                  <h3>{post.title}</h3>
                  <p className="muted">{post.excerpt}</p>
                  <div className="home-blog-meta">
                    <span className="muted small">{post.date}</span>
                    <span className="muted small">{post.readTime || '5'} min read</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </Layout>
  );
}
