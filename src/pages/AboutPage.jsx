import Layout from '../components/Layout';

const AboutPage = () => (
  <Layout>
    <section className="hero slim">
      <p className="eyebrow">About Caleb</p>
      <h1>Filmmaker turned photographer.</h1>
      <p className="lead">
        I learned to light for motion pictures before falling in love with stills. That mix of
        cinematic tone and honest, documentary moments defines my work today.
      </p>
    </section>
    <section className="section">
      <div className="grid about-grid">
        <div>
          <h3>Philosophy</h3>
          <p>
            I believe photos should feel lived-in and cinematic. I direct when helpful,
            then step back and let authentic moments unfold.
          </p>
          <h3>Approach</h3>
          <p>
            Every project starts with a discovery call to understand your story. From
            scouting and shot lists to color grading, I handle the details.
          </p>
        </div>
        <div className="bio-card">
          <div className="tag">Beyond the camera</div>
          <ul>
            <li>Based in Portland, traveling often for destination work.</li>
            <li>Mentors emerging photographers on lighting and workflow.</li>
            <li>Collects zines and 35mm film cameras.</li>
          </ul>
        </div>
      </div>
    </section>
  </Layout>
);

export default AboutPage;
