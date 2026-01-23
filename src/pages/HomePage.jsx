import Layout from '../components/Layout';
import HeroGallery from '../components/HeroGallery';

const HomePage = () => (
  <Layout className="home-fixed">
    {/* DEV NOTE */}
    <div
      style={{
        background: '#ffcc00',
        color: '#000',
        padding: '8px 12px',
        fontSize: '14px',
        textAlign: 'center',
        fontWeight: '600',
      }}
    >
      ⚠️ Development Page — Features and content are subject to change.
    </div>

    <HeroGallery />
  </Layout>
);

export default HomePage;
