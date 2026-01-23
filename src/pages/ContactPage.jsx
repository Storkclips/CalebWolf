import Layout from '../components/Layout';

const ContactPage = () => (
  <Layout>
    <section className="hero slim">
      <p className="eyebrow">Let’s talk</p>
      <h1>Tell me about your date, vision, and priorities.</h1>
      <p className="lead">
        I respond to every inquiry within one business day. Include your location and
        dream moments.
      </p>
    </section>
    <section className="section">
      <form
        name="contact"
        method="POST"
        data-netlify="true"
        netlify-honeypot="bot-field"
        className="form"
      >
        <input type="hidden" name="form-name" value="contact" />
        <p className="hidden">
          <label>
            Don’t fill this out if you’re human: <input name="bot-field" />
          </label>
        </p>
        <div className="grid form-grid">
          <label>
            Name
            <input name="name" type="text" placeholder="Your name" required />
          </label>
          <label>
            Email
            <input name="email" type="email" placeholder="you@example.com" required />
          </label>
          <label>
            Event date
            <input name="date" type="date" />
          </label>
          <label>
            Location
            <input name="location" type="text" placeholder="City, venue" />
          </label>
        </div>
        <label>
          What are you dreaming up?
          <textarea
            name="message"
            rows="5"
            placeholder="Share your story, timeline, and any must-have moments."
            required
          ></textarea>
        </label>
        <div className="hero-actions">
          <button type="submit" className="btn">
            Send inquiry
          </button>
          <p className="muted">Or email hello@calebwolf.com</p>
        </div>
      </form>
    </section>
  </Layout>
);

export default ContactPage;
