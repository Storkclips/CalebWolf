import Layout from '../components/Layout';
import HeroGallery from '../components/HeroGallery';

const HomePage = () => (
  <Layout className="home-fixed">
    <div style={{ position: 'relative' }}>
      {process.env.NODE_ENV !== 'production' && (
        <div
          style={{
            position: 'absolute',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            background: 'rgba(255, 68, 68, 0.9)',
            color: '#fff',
            padding: '8px 14px',
            fontSize: '14px',
            fontWeight: '600',
            borderRadius: '6px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
            pointerEvents: 'none',
          }}
        >
          DEV BUILD — This page is under active development
        </div>
      )}

      <HeroGallery />
    </div>
  </Layout>
);

export default HomePage;
