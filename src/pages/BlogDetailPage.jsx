import { Link, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { useStore } from '../store/StoreContext';
import { getStoredPosts } from '../utils/blog';

const BlogDetailPage = () => {
  const { postId } = useParams();
  const { addToCart, cart, creditBalance } = useStore();
  const posts = getStoredPosts();
  const post = posts.find((entry) => entry.id === postId);

  if (!post) {
    return (
      <Layout>
        <section className="hero slim">
          <p className="eyebrow">Blog</p>
          <h1>Story not found</h1>
          <p className="lead">We could not find that post in local storage.</p>
          <div className="hero-actions">
            <Link className="ghost" to="/blog">
              Back to blog
            </Link>
          </div>
        </section>
      </Layout>
    );
  }

  const handleAddToCart = (image) => {
    addToCart({
      id: image.id,
      title: image.title,
      price: image.price,
      collectionTitle: post.title,
      preview: image.url,
    });
  };

  return (
    <Layout>
      <section className="hero slim">
        <p className="eyebrow">{post.tag}</p>
        <h1>{post.title}</h1>
        <p className="lead">{post.excerpt}</p>
        <div className="hero-actions">
          <Link className="ghost" to="/blog">
            Back to blog
          </Link>
          <Link className="ghost" to={`/blog/${post.id}/edit`}>
            Edit story
          </Link>
          <Link className="pill" to="/cart">
            View cart ({cart.length})
          </Link>
          <span className="muted small">Credits available: {creditBalance}</span>
        </div>
      </section>

      <section className="section blog-story">
        <div className="blog-story-body">
          {post.contentHtml || post.content ? (
            <div
              className="blog-body"
              dangerouslySetInnerHTML={{ __html: post.contentHtml || post.content }}
            />
          ) : (
            <p className="muted">Add story content to see the full article here.</p>
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
                  <button className="pill" type="button" onClick={() => handleAddToCart(image)}>
                    Buy photo
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
};

export default BlogDetailPage;
