import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { defaultBlogPosts } from '../data';
import { useStore } from '../store/StoreContext';
import { getStoredPosts } from '../utils/blog';

const BlogPage = () => {
  const { addToCart, cart, creditBalance } = useStore();
  const [posts, setPosts] = useState(defaultBlogPosts);
  const [cartMessage, setCartMessage] = useState('');

  useEffect(() => {
    setPosts(getStoredPosts());
  }, []);

  useEffect(() => {
    if (!cartMessage) return undefined;
    const timer = setTimeout(() => setCartMessage(''), 2200);
    return () => clearTimeout(timer);
  }, [cartMessage]);

  const handleAddToCart = (post, image) => {
    addToCart({
      id: image.id,
      title: image.title,
      price: image.price,
      collectionTitle: post.title,
      preview: image.url,
    });
    setCartMessage('Added image to cart.');
  };

  return (
    <Layout>
      <section className="hero slim">
        <p className="eyebrow">Blog</p>
        <h1>Behind the scenes & resources.</h1>
        <p className="lead">
          Notes on lighting, storytelling, and the images you can license with credits.
        </p>
        <div className="hero-actions">
          <Link className="pill" to="/blog/new">
            Create new post
          </Link>
          <Link className="ghost" to="/cart">
            View cart ({cart.length})
          </Link>
          <span className="muted small">Credits available: {creditBalance}</span>
        </div>
        {cartMessage && <div className="notice">{cartMessage}</div>}
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Manage</p>
            <h2>Drafts & published posts</h2>
          </div>
          <p className="muted small">Saved locally for testing in this browser.</p>
        </div>
        <div className="blog-manage-grid">
          {posts.map((post) => (
            <article key={post.id} className="card blog-manage-card">
              <div className="card-body">
                <div className="tag">{post.tag}</div>
                <h3>{post.title}</h3>
                <p className="muted">{post.excerpt}</p>
                <p className="muted small">{post.date}</p>
              </div>
              <div className="card-footer">
                <Link className="ghost" to={`/blog/${post.id}/edit`}>
                  Edit post
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Reader view</p>
            <h2>Live blog feed</h2>
          </div>
        </div>
        <div className="grid blog-grid">
          {posts.map((post) => (
            <article key={post.id} className="card blog blog-post-card">
              <div className="card-body">
                <div className="tag">{post.tag}</div>
                <h3>{post.title}</h3>
                <p className="muted">{post.excerpt}</p>
                <p className="muted small">{post.date}</p>
                {(post.contentHtml || post.content) && (
                  <div
                    className="blog-body"
                    dangerouslySetInnerHTML={{ __html: post.contentHtml || post.content }}
                  />
                )}
              </div>
              {post.images?.length > 0 && (
                <div className="blog-post-images">
                  {post.images.map((image) => (
                    <div key={image.id} className="blog-post-image-card">
                      <img src={image.url} alt={image.title} />
                      <div className="blog-post-image-body">
                        <div>
                          <strong>{image.title}</strong>
                          <p className="muted small">{image.price} credits</p>
                        </div>
                        <button
                          className="pill"
                          type="button"
                          onClick={() => handleAddToCart(post, image)}
                        >
                          Buy photo
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </Layout>
  );
};

export default BlogPage;
