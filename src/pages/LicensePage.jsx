import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { usePageSeo } from '../contexts/SeoContext';

const LicensePage = () => {
  usePageSeo('license', {
    site_title: 'Image Licensing — Caleb Wolf Photography',
    meta_description: 'License Caleb Wolf’s landscape photography for editorial and commercial use. Clear terms, fast turnaround, worldwide usage.',
    og_title: 'Image Licensing — Caleb Wolf Photography',
    og_description: 'License Caleb Wolf’s landscape photography for editorial and commercial use.',
  });
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
