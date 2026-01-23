import { Link } from 'react-router-dom';
import { blogPosts } from '../data';

const BlogPreview = () => (
  <section className="section">
    <div className="section-head">
      <div>
        <p className="eyebrow">Journal</p>
        <h2>Latest blog posts</h2>
      </div>
      <Link className="ghost" to="/blog">
        See all posts
      </Link>
    </div>
    <div className="grid blog-grid">
      {blogPosts.map((post) => (
        <article key={post.id} className="card blog">
          <div className="card-body">
            <div className="tag">{post.tag}</div>
            <h3>{post.title}</h3>
            <p className="muted">{post.excerpt}</p>
            <div className="muted small">{post.date}</div>
          </div>
        </article>
      ))}
    </div>
  </section>
);

export default BlogPreview;
