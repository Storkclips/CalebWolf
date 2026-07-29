import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { usePageSeo } from '../contexts/SeoContext';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const SERVICES = ['Wedding', 'Elopement', 'Portrait', 'Brand / Commercial', 'Event', 'Other'];

const DEFAULT_INFO = {
  contact_email: 'hello@calebwolf.com',
  based_in: 'Portland, Oregon',
  response_time: 'Within 1 business day',
};

const ContactPage = () => {
  usePageSeo({
    site_title: 'Contact — Caleb Wolf Photography',
    meta_description: 'Get in touch to book a photography session, order custom prints, or ask about licensing. Based in the Pacific Northwest, available worldwide.',
    og_title: 'Contact Caleb Wolf',
    og_description: 'Book a session, order prints, or inquire about licensing cinematic photography by Caleb Wolf.',
  });
  const [info, setInfo] = useState(DEFAULT_INFO);
  const [form, setForm] = useState({
    name: '',
    email: '',
    date: '',
    location: '',
    service: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase
      .from('contact_settings')
      .select('contact_email, based_in, response_time')
      .maybeSingle()
      .then(({ data }) => {
        if (data) setInfo({ ...DEFAULT_INFO, ...data });
      });
  }, []);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setStatus(null);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send message');
      setStatus('success');
      setForm({ name: '', email: '', date: '', location: '', service: '', message: '' });
    } catch (err) {
      setError(err.message);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'success') {
    return (
      <Layout>
        <div className="contact-success">
          <div className="contact-success-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h2>Message sent!</h2>
          <p className="muted">
            Thanks for reaching out. I'll be in touch within one business day.
            Check your inbox — a confirmation has been sent to your email.
          </p>
          <a href="/" className="btn" style={{ marginTop: 24 }}>Back to home</a>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="contact-layout">
        {/* Left: info */}
        <aside className="contact-aside">
          <p className="eyebrow">Let's talk</p>
          <h1>Tell me about your vision.</h1>
          <p className="muted">
            I respond to every inquiry personally. The more detail you share,
            the better I can tailor a quote for you.
          </p>

          <div className="contact-details">
            <div className="contact-detail-item">
              <div className="contact-detail-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <div>
                <p className="contact-detail-label">Email</p>
                <p className="contact-detail-value">{info.contact_email}</p>
              </div>
            </div>
            <div className="contact-detail-item">
              <div className="contact-detail-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div>
                <p className="contact-detail-label">Based in</p>
                <p className="contact-detail-value">{info.based_in}</p>
              </div>
            </div>
            <div className="contact-detail-item">
              <div className="contact-detail-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div>
                <p className="contact-detail-label">Response time</p>
                <p className="contact-detail-value">{info.response_time}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Right: form */}
        <div className="contact-form-wrap">
          <form className="contact-form" onSubmit={handleSubmit} noValidate>
            {status === 'error' && (
              <div className="auth-error" style={{ marginBottom: 20 }}>{error}</div>
            )}

            <div className="contact-form-row">
              <label className="contact-label">
                Your name
                <input
                  type="text"
                  value={form.name}
                  onChange={set('name')}
                  placeholder="Jane Smith"
                  required
                  disabled={loading}
                />
              </label>
              <label className="contact-label">
                Email address
                <input
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  placeholder="jane@example.com"
                  required
                  disabled={loading}
                />
              </label>
            </div>

            <label className="contact-label">
              Service type
              <div className="contact-service-grid">
                {SERVICES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`contact-service-pill${form.service === s ? ' active' : ''}`}
                    onClick={() => setForm((f) => ({ ...f, service: s }))}
                    disabled={loading}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </label>

            <div className="contact-form-row">
              <label className="contact-label">
                Event date
                <input
                  type="date"
                  value={form.date}
                  onChange={set('date')}
                  disabled={loading}
                />
              </label>
              <label className="contact-label">
                Location / venue
                <input
                  type="text"
                  value={form.location}
                  onChange={set('location')}
                  placeholder="City, venue name"
                  disabled={loading}
                />
              </label>
            </div>

            <label className="contact-label">
              Tell me about your vision
              <textarea
                value={form.message}
                onChange={set('message')}
                rows={5}
                placeholder="Share your story, timeline, and any must-have moments…"
                required
                disabled={loading}
              />
            </label>

            <div className="contact-form-footer">
              <button type="submit" className="btn contact-submit" disabled={loading}>
                {loading ? 'Sending…' : 'Send inquiry'}
              </button>
              <p className="muted small">{info.response_time}.</p>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default ContactPage;
