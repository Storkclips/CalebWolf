import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

const heroSlides = [
  {
    id: 'hero-1',
    title: 'Autumn elopement collection',
    subtitle: 'Editorial portraits with a cinematic glow.',
    cta: 'View collection',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'hero-2',
    title: 'Studio portrait sessions',
    subtitle: 'Guided posing, refined lighting, timeless edits.',
    cta: 'Book a session',
    image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80',
  },
];

const collections = [
  {
    id: 'weddings',
    title: 'Weddings',
    cover: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=800&q=80',
    imageCount: 48,
  },
  {
    id: 'portraits',
    title: 'Portraits',
    cover: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
    imageCount: 36,
  },
  {
    id: 'brands',
    title: 'Brands',
    cover: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=800&q=80',
    imageCount: 28,
  },
];

const pricingPackages = [
  {
    id: 'classic',
    title: 'Classic wedding',
    duration: '8 hours',
    price: '$4,200',
    credits: 45,
  },
  {
    id: 'editorial',
    title: 'Editorial portrait',
    duration: '3 hours',
    price: '$1,400',
    credits: 18,
  },
  {
    id: 'brand',
    title: 'Brand launch',
    duration: 'Half day',
    price: '$2,800',
    credits: 32,
  },
];

const AdminPage = () => {
  return (
    <Layout>
      <section className="hero slim">
        <div className="hero-copy">
          <p className="eyebrow">Admin dashboard</p>
          <h1>Update every pixel of the studio site.</h1>
          <p className="lead">
            Manage hero imagery, refresh About copy, upload new collections, and adjust pricing
            from one place.
          </p>
          <div className="hero-actions">
            <button className="pill" type="button">
              Save updates
            </button>
            <button className="ghost" type="button">
              Publish changes
            </button>
            <Link className="ghost" to="/blog/admin">
              Blog admin
            </Link>
          </div>
        </div>
        <div className="hero-panel">
          <div className="floating-card">
            <p className="eyebrow">Quick status</p>
            <h3>Site edits pending</h3>
            <p className="muted">
              3 sections have unpublished changes. Last synced 28 minutes ago.
            </p>
            <div className="hero-actions subtle">
              <button className="btn" type="button">
                Review updates
              </button>
              <button className="ghost" type="button">
                View live site
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Home hero</p>
            <h2>Edit hero messaging & imagery</h2>
          </div>
          <button className="ghost" type="button">
            Add hero slide
          </button>
        </div>
        <div className="grid admin-grid">
          {heroSlides.map((slide) => (
            <article key={slide.id} className="card admin-card">
              <div className="admin-card-header">
                <div>
                  <h3>{slide.title}</h3>
                  <p className="muted small">{slide.subtitle}</p>
                </div>
                <button className="ghost" type="button">
                  Replace image
                </button>
              </div>
              <img src={slide.image} alt={slide.title} className="admin-thumb" />
              <form className="form admin-form">
                <label>
                  Headline
                  <input defaultValue={slide.title} />
                </label>
                <label>
                  Subhead
                  <textarea rows="2" defaultValue={slide.subtitle} />
                </label>
                <label>
                  CTA label
                  <input defaultValue={slide.cta} />
                </label>
                <label>
                  Upload hero image
                  <input type="file" />
                </label>
              </form>
            </article>
          ))}
        </div>
      </section>

      <section className="section alt">
        <div className="section-head">
          <div>
            <p className="eyebrow">About</p>
            <h2>Refresh About page storytelling</h2>
          </div>
          <button className="ghost" type="button">
            Preview About
          </button>
        </div>
        <div className="grid admin-grid">
          <article className="card admin-card">
            <h3>Intro copy</h3>
            <form className="form admin-form">
              <label>
                Headline
                <input defaultValue="Documentary meets editorial." />
              </label>
              <label>
                Bio
                <textarea
                  rows="5"
                  defaultValue="Caleb Wolf is a fine-art photographer blending natural light with art direction for modern celebrations."
                />
              </label>
              <label>
                Featured press
                <input defaultValue="Vogue, Kinfolk, Harper's Bazaar" />
              </label>
            </form>
          </article>
          <article className="card admin-card">
            <h3>Studio details</h3>
            <form className="form admin-form">
              <label>
                Location
                <input defaultValue="Portland, OR + worldwide travel" />
              </label>
              <label>
                Values statement
                <textarea
                  rows="4"
                  defaultValue="We create heirloom imagery by focusing on story, movement, and a calm portrait experience."
                />
              </label>
              <label>
                Upload studio portrait
                <input type="file" />
              </label>
            </form>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Collections</p>
            <h2>Upload photos, assign prices, and curate galleries</h2>
          </div>
          <button className="ghost" type="button">
            New collection
          </button>
        </div>
        <div className="grid admin-grid">
          <article className="card admin-card">
            <h3>Upload queue</h3>
            <form className="form admin-form">
              <label>
                Select collection
                <input defaultValue="Weddings" />
              </label>
              <label>
                Set price per image
                <input defaultValue="$95" />
              </label>
              <label>
                Upload photos
                <input type="file" multiple />
              </label>
              <label>
                License notes
                <textarea
                  rows="3"
                  defaultValue="Personal usage for print + digital sharing."
                />
              </label>
              <button className="btn" type="button">
                Add to collection
              </button>
            </form>
          </article>
          <article className="card admin-card">
            <h3>Current collections</h3>
            <div className="admin-collection-list">
              {collections.map((collection) => (
                <div key={collection.id} className="admin-collection-row">
                  <img src={collection.cover} alt={collection.title} />
                  <div>
                    <strong>{collection.title}</strong>
                    <p className="muted small">{collection.imageCount} photos</p>
                  </div>
                  <button className="ghost" type="button">
                    Edit
                  </button>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="section alt">
        <div className="section-head">
          <div>
            <p className="eyebrow">Pricing</p>
            <h2>Manage packages & credit pricing</h2>
          </div>
          <button className="ghost" type="button">
            Add package
          </button>
        </div>
        <div className="grid admin-grid">
          {pricingPackages.map((pkg) => (
            <article key={pkg.id} className="card admin-card">
              <div className="admin-card-header">
                <div>
                  <h3>{pkg.title}</h3>
                  <p className="muted small">{pkg.duration}</p>
                </div>
                <button className="ghost" type="button">
                  Update
                </button>
              </div>
              <form className="form admin-form">
                <label>
                  Package title
                  <input defaultValue={pkg.title} />
                </label>
                <label>
                  Session length
                  <input defaultValue={pkg.duration} />
                </label>
                <label>
                  Starting price
                  <input defaultValue={pkg.price} />
                </label>
                <label>
                  Included credits
                  <input defaultValue={pkg.credits} />
                </label>
              </form>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Client experience</p>
            <h2>Client download galleries & delivery settings</h2>
          </div>
          <button className="ghost" type="button">
            Create gallery
          </button>
        </div>
        <div className="grid admin-grid">
          <article className="card admin-card">
            <h3>Delivery defaults</h3>
            <form className="form admin-form">
              <label>
                Gallery access window
                <input defaultValue="90 days" />
              </label>
              <label>
                Download password
                <input defaultValue="CW-2024" />
              </label>
              <label>
                Email template
                <textarea
                  rows="4"
                  defaultValue="Hi there! Your gallery is ready. Use the link below to download your images."
                />
              </label>
            </form>
          </article>
          <article className="card admin-card">
            <h3>Featured home carousel</h3>
            <form className="form admin-form">
              <label>
                Select images to highlight
                <input defaultValue="AutumnElopement_14, StudioPortrait_07" />
              </label>
              <label>
                Homepage tagline
                <textarea
                  rows="3"
                  defaultValue="Intentional imagery for modern celebrations, brand founders, and artists."
                />
              </label>
              <label>
                Upload highlights
                <input type="file" multiple />
              </label>
            </form>
          </article>
        </div>
      </section>
    </Layout>
  );
};

export default AdminPage;
