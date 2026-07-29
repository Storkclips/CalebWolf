import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const AdminNewsletterPanel = () => {
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadSubscribers();
  }, []);

  const loadSubscribers = async () => {
    try {
      setLoading(true);
      setError('');
      const { data, error: err } = await supabase
        .from('newsletter_subscribers')
        .select('*')
        .order('subscribed_at', { ascending: false });
      if (err) throw err;
      setSubscribers(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load subscribers');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    setSendResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-newsletter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ subject, htmlBody: body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send');
      setSendResult({ type: 'success', text: `Email sent to ${data.sentTo} subscriber${data.sentTo === 1 ? '' : 's'}.` });
      setSubject('');
      setBody('');
    } catch (err) {
      setSendResult({ type: 'error', text: err.message || 'Failed to send' });
    } finally {
      setSending(false);
      setTimeout(() => setSendResult(null), 5000);
    }
  };

  const handleRemove = async (id) => {
    if (!window.confirm('Remove this subscriber?')) return;
    const { error: err } = await supabase.from('newsletter_subscribers').delete().eq('id', id);
    if (err) {
      setError(err.message);
      return;
    }
    setSubscribers(subscribers.filter((s) => s.id !== id));
  };

  const handleToggleUnsub = async (sub) => {
    const newUnsub = !sub.unsubscribed;
    const { error: err } = await supabase
      .from('newsletter_subscribers')
      .update({ unsubscribed: newUnsub, unsubscribed_at: newUnsub ? new Date().toISOString() : null })
      .eq('id', sub.id);
    if (err) { setError(err.message); return; }
    setSubscribers(subscribers.map((s) => s.id === sub.id ? { ...s, unsubscribed: newUnsub } : s));
  };

  const filtered = subscribers.filter((s) =>
    s.email.toLowerCase().includes(filter.toLowerCase())
  );
  const activeCount = subscribers.filter((s) => !s.unsubscribed).length;

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h3>Newsletter</h3>
        <p className="muted small">Compose announcements and manage subscribers.</p>
      </div>

      {error && <div className="admin-error" style={{ marginBottom: '16px' }}>{error}</div>}

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div className="adm-stat-card" style={{ flex: '1 1 140px', padding: 16, border: '1px solid var(--border)', borderRadius: 12, background: 'rgba(255,255,255,0.03)' }}>
          <p className="muted small" style={{ margin: 0, textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.06em' }}>Total Subscribers</p>
          <p style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 700 }}>{subscribers.length}</p>
        </div>
        <div className="adm-stat-card" style={{ flex: '1 1 140px', padding: 16, border: '1px solid var(--border)', borderRadius: 12, background: 'rgba(255,255,255,0.03)' }}>
          <p className="muted small" style={{ margin: 0, textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.06em' }}>Active</p>
          <p style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 700, color: '#22c55e' }}>{activeCount}</p>
        </div>
        <div className="adm-stat-card" style={{ flex: '1 1 140px', padding: 16, border: '1px solid var(--border)', borderRadius: 12, background: 'rgba(255,255,255,0.03)' }}>
          <p className="muted small" style={{ margin: 0, textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.06em' }}>Unsubscribed</p>
          <p style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 700, color: '#888' }}>{subscribers.length - activeCount}</p>
        </div>
      </div>

      {/* Compose form */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 14, padding: 20, marginBottom: 24, background: 'rgba(255,255,255,0.02)' }}>
        <h4 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>Compose Message</h4>
        <div style={{ display: 'grid', gap: 12 }}>
          <input
            type="text"
            placeholder="Email subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(10,10,16,0.4)', color: 'var(--text)', fontSize: 14 }}
          />
          <textarea
            placeholder="Write your message here. HTML is supported."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(10,10,16,0.4)', color: 'var(--text)', fontSize: 14, fontFamily: 'monospace', lineHeight: 1.6, resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              className="btn"
              onClick={handleSend}
              disabled={sending || !subject.trim() || !body.trim()}
            >
              {sending ? 'Sending...' : 'Send to all subscribers'}
            </button>
            <span className="muted small">Sends to {activeCount} active subscriber{activeCount === 1 ? '' : 's'}</span>
          </div>
          {sendResult && (
            <p style={{ margin: '4px 0 0', fontSize: 13, color: sendResult.type === 'success' ? '#22c55e' : '#f59e0b' }}>
              {sendResult.text}
            </p>
          )}
        </div>
      </div>

      {/* Subscriber list */}
      <div style={{ marginBottom: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Subscribers</h4>
        <input
          type="text"
          placeholder="Filter by email..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(10,10,16,0.4)', color: 'var(--text)', fontSize: 13, flex: 1, minWidth: 200 }}
        />
      </div>

      {loading ? (
        <p className="muted">Loading subscribers...</p>
      ) : filtered.length === 0 ? (
        <p className="muted">No subscribers found.</p>
      ) : (
        <div className="admin-table">
          <div className="admin-table-header">
            <div className="admin-table-cell">Email</div>
            <div className="admin-table-cell">Subscribed</div>
            <div className="admin-table-cell">Status</div>
            <div className="admin-table-cell">Actions</div>
          </div>
          {filtered.map((sub) => (
            <div key={sub.id} className="admin-table-row">
              <div className="admin-table-cell">
                <a href={`mailto:${sub.email}`} style={{ color: 'var(--text)', textDecoration: 'none' }}>{sub.email}</a>
              </div>
              <div className="admin-table-cell muted small">
                {new Date(sub.subscribed_at).toLocaleDateString()}
              </div>
              <div className="admin-table-cell">
                {sub.unsubscribed ? (
                  <span style={{ color: '#888' }}>Unsubscribed</span>
                ) : (
                  <span style={{ color: '#22c55e' }}>Active</span>
                )}
              </div>
              <div className="admin-table-cell" style={{ display: 'flex', gap: 6 }}>
                <a href={`mailto:${sub.email}`} className="ghost small-btn" style={{ textDecoration: 'none' }}>Email</a>
                <button className="ghost small-btn" onClick={() => handleToggleUnsub(sub)}>
                  {sub.unsubscribed ? 'Reactivate' : 'Unsub'}
                </button>
                <button className="ghost small-btn" onClick={() => handleRemove(sub.id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminNewsletterPanel;
