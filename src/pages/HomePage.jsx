import Layout from '../components/Layout';
import HeroGallery from '../components/HeroGallery';

const HomePage = () => (
  <Layout className="home-fixed">
    <HeroGallery />

    {process.env.NODE_ENV !== 'production' && (
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          width: '100%',
          zIndex: 9999,
          background: 'rgba(255, 68, 68, 0.95)',
          color: '#fff',
          padding: '10px 16px',
          fontSize: '14px',
          fontWeight: '600',
          textAlign: 'center',
          boxShadow: '0 -4px 10px rgba(0,0,0,0.35)',
          pointerEvents: 'none',
        }}
      >
        DEV BUILD — This page is under active development
      </div>
    )}
  </Layout>
);

export default HomePage;
