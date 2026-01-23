import Layout from '../components/Layout';
import { blogPosts } from '../data';

const BlogPage = () => (
  <Layout>
    <section className="hero slim">
      <p className="eyebrow">Blog</p>
      <h1>Behind the scenes & resources.</h1>
      <p className="lead">Notes on lighting, storytelling, and real sessions.</p>
    </section>
    <section className="section">
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
  </Layout>
);

export default BlogPage;
