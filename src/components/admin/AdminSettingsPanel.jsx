import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const AdminSettingsPanel = () => {
  const [fields, setFields] = useState({
    admin_email: '',
    contact_email: '',
    based_in: '',
    response_time: '',
  });
  const [settingsId, setSettingsId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.from('contact_settings').select('*').maybeSingle();
      if (data) {
        setFields({
          admin_email: data.admin_email || '',
          contact_email: data.contact_email || '',
          based_in: data.based_in || '',
          response_time: data.response_time || '',
        });
        setSettingsId(data.id);
      }
      setLoading(false);
    };
    load();
  }, []);

  const set = (field) => (e) => setFields((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const { error } = await supabase
      .from('contact_settings')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', settingsId);
    if (error) {
      setMsg({ type: 'error', text: error.message });
    } else {
      setMsg({ type: 'success', text: 'Settings saved.' });
    }
    setSaving(false);
    setTimeout(() => setMsg(null), 3000);
  };

  return (
    <div className="adm-panel">
      <div className="adm-panel-header">
        <div>
          <p className="eyebrow">Configuration</p>
          <h2>Settings</h2>
          <p className="muted">Site-wide configuration options.</p>
        </div>
      </div>

      {loading ? (
        <div className="adm-users-loading">
          <div className="adm-users-loading-spinner" />
          <p className="muted">Loading…</p>
        </div>
      ) : (
        <form onSubmit={handleSave}>
          <div className="adm-settings-grid">

            {/* Contact page info */}
            <div className="adm-settings-card">
              <h3 className="adm-settings-card-title">Contact page info</h3>
              <p className="muted small" style={{ marginBottom: 20 }}>
                These values are displayed publicly on the contact page.
              </p>
              <div className="adm-settings-form">
                <label className="adm-settings-label">
                  Public email
                  <input
                    type="email"
                    value={fields.contact_email}
                    onChange={set('contact_email')}
                    placeholder="hello@example.com"
                    disabled={saving}
                  />
                </label>
                <label className="adm-settings-label">
                  Based in
                  <input
                    type="text"
                    value={fields.based_in}
                    onChange={set('based_in')}
                    placeholder="Portland, Oregon"
                    disabled={saving}
                  />
                </label>
                <label className="adm-settings-label">
                  Response time
                  <input
                    type="text"
                    value={fields.response_time}
                    onChange={set('response_time')}
                    placeholder="Within 1 business day"
                    disabled={saving}
                  />
                </label>
              </div>
            </div>

            {/* Notifications */}
            <div className="adm-settings-card">
              <h3 className="adm-settings-card-title">Notifications</h3>
              <p className="muted small" style={{ marginBottom: 20 }}>
                When someone submits the contact form, a notification is sent to this address.
              </p>
              <div className="adm-settings-form">
                <label className="adm-settings-label">
                  Admin notification email
                  <input
                    type="email"
                    value={fields.admin_email}
                    onChange={set('admin_email')}
                    required
                    placeholder="admin@example.com"
                    disabled={saving}
                  />
                </label>
              </div>
            </div>

          </div>

          {msg && (
            <div className={msg.type === 'success' ? 'notice' : 'auth-error'} style={{ margin: '16px 0 0' }}>
              {msg.text}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            <button type="submit" className="btn" disabled={saving || !fields.admin_email.trim()}>
              {saving ? 'Saving…' : 'Save settings'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default AdminSettingsPanel;
