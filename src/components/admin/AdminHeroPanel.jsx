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

const AdminHeroPanel = () => {
  return (
    <section className="section">
      <div className="section-head">
        <div>
          <p className="eyebrow">Home hero</p>
          <h2>Edit hero messaging & imagery</h2>
        </div>
        <button className="ghost" type="button">Add hero slide</button>
      </div>
      <div className="grid admin-grid">
        {heroSlides.map((slide) => (
          <article key={slide.id} className="card admin-card">
            <div className="admin-card-header">
              <div>
                <h3>{slide.title}</h3>
                <p className="muted small">{slide.subtitle}</p>
              </div>
              <button className="ghost" type="button">Replace image</button>
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
  );
};

export default AdminHeroPanel;
