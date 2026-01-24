import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { defaultBlogPosts } from '../data';
import { getStoredPosts } from '../utils/blog';

const BlogPreview = () => {
  const [posts, setPosts] = useState(defaultBlogPosts);

  useEffect(() => {
    setPosts(getStoredPosts());
  }, []);

  return (
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
        {posts.slice(0, 3).map((post) => (
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
};

export default BlogPreview;
