const pricingPackages = [
  { id: 'classic', title: 'Classic wedding', duration: '8 hours', price: '$4,200', credits: 45 },
  { id: 'editorial', title: 'Editorial portrait', duration: '3 hours', price: '$1,400', credits: 18 },
  { id: 'brand', title: 'Brand launch', duration: 'Half day', price: '$2,800', credits: 32 },
];

const AdminPricingPanel = () => {
  return (
    <section className="section">
      <div className="section-head">
        <div>
          <p className="eyebrow">Pricing</p>
          <h2>Manage packages & credit pricing</h2>
        </div>
        <button className="ghost" type="button">Add package</button>
      </div>
      <div className="grid admin-grid">
        {pricingPackages.map((pkg) => (
          <article key={pkg.id} className="card admin-card">
            <div className="admin-card-header">
              <div>
                <h3>{pkg.title}</h3>
                <p className="muted small">{pkg.duration}</p>
              </div>
              <button className="ghost" type="button">Update</button>
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
  );
};

export default AdminPricingPanel;
