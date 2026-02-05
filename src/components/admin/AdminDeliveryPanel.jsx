const AdminDeliveryPanel = () => {
  return (
    <section className="section">
      <div className="section-head">
        <div>
          <p className="eyebrow">Client experience</p>
          <h2>Client download galleries & delivery settings</h2>
        </div>
        <button className="ghost" type="button">Create gallery</button>
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
              <textarea rows="4" defaultValue="Hi there! Your gallery is ready. Use the link below to download your images." />
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
              <textarea rows="3" defaultValue="Intentional imagery for modern celebrations, brand founders, and artists." />
            </label>
            <label>
              Upload highlights
              <input type="file" multiple />
            </label>
          </form>
        </article>
      </div>
    </section>
  );
};

export default AdminDeliveryPanel;
