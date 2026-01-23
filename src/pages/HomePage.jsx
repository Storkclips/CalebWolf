import Layout from '../components/Layout';
import HeroGallery from '../components/HeroGallery';

const HomePage = () => (
  <Layout className="home-fixed">
    {process.env.NODE_ENV !== 'production' && (
      <div
        style={{
          background: '#ff4444',
          color: '#fff',
          padding: '8px 12px',
          fontSize: '14px',
          textAlign: 'center',
          fontWeight: '600',
        }}
      >
        DEV BUILD — This page is under active development.
      </div>
    )}

    <HeroGallery />
  </Layout>
);

export default HomePage;
