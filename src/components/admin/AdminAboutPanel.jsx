const AdminAboutPanel = () => {
  return (
    <section className="section">
      <div className="section-head">
        <div>
          <p className="eyebrow">About</p>
          <h2>Refresh About page storytelling</h2>
        </div>
        <button className="ghost" type="button">Preview About</button>
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
              <textarea rows="5" defaultValue="Caleb Wolf is a fine-art photographer blending natural light with art direction for modern celebrations." />
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
              <textarea rows="4" defaultValue="We create heirloom imagery by focusing on story, movement, and a calm portrait experience." />
            </label>
            <label>
              Upload studio portrait
              <input type="file" />
            </label>
          </form>
        </article>
      </div>
    </section>
  );
};

export default AdminAboutPanel;
