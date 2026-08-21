import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';

const LicensePage = () => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('license_settings')
      .select('content_html')
      .maybeSingle()
      .then(({ data }) => {
        setContent(data?.content_html || '<p>No license content has been set yet.</p>');
        setLoading(false);
      });
  }, []);

  return (
    <Layout>
      <section className="section">
        <div className="blog-article-content" style={{ maxWidth: 760, margin: '0 auto' }}>
          {loading ? (
            <p className="muted">Loading…</p>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: content }} />
          )}
        </div>
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <Link className="ghost" to="/checkout">Back to checkout</Link>
        </div>
      </section>
    </Layout>
  );
};

export default LicensePage;
