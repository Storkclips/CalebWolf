import { useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import AdminImagesPanel from '../components/admin/AdminImagesPanel';
import AdminCollectionsPanel from '../components/admin/AdminCollectionsPanel';
import AdminHeroPanel from '../components/admin/AdminHeroPanel';
import AdminAboutPanel from '../components/admin/AdminAboutPanel';
import AdminPricingPanel from '../components/admin/AdminPricingPanel';
import AdminDeliveryPanel from '../components/admin/AdminDeliveryPanel';

const tabs = [
  { id: 'collections', label: 'Collections' },
  { id: 'images', label: 'Images' },
  { id: 'hero', label: 'Hero' },
  { id: 'about', label: 'About' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'delivery', label: 'Delivery' },
];

const AdminPage = () => {
  const [active, setActive] = useState('collections');

  return (
    <Layout>
      <section className="hero slim">
        <div className="hero-copy">
          <p className="eyebrow">Admin dashboard</p>
          <h1>Manage your studio site.</h1>
          <p className="lead">
            Collections, images, hero imagery, about copy, pricing, and delivery settings -- all in one place.
          </p>
          <div className="hero-actions">
            <Link className="ghost" to="/blog/admin">Blog admin</Link>
          </div>
        </div>
      </section>

      <div className="admin-tabs-bar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`admin-tab${active === tab.id ? ' active' : ''}`}
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="admin-panel-container">
        {active === 'collections' && <AdminCollectionsPanel />}
        {active === 'images' && <AdminImagesPanel />}
        {active === 'hero' && <AdminHeroPanel />}
        {active === 'about' && <AdminAboutPanel />}
        {active === 'pricing' && <AdminPricingPanel />}
        {active === 'delivery' && <AdminDeliveryPanel />}
      </div>
    </Layout>
  );
};

export default AdminPage;
