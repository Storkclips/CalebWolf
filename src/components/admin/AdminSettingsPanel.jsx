import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const AdminSettingsPanel = () => {
  const [adminEmail, setAdminEmail] = useState('');
  const [settingsId, setSettingsId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase.from('contact_settings').select('*').maybeSingle();
      if (data) {
        setAdminEmail(data.admin_email);
        setSettingsId(data.id);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const { error } = await supabase
      .from('contact_settings')
      .update({ admin_email: adminEmail.trim(), updated_at: new Date().toISOString() })
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
        <div className="adm-settings-grid">
          <div className="adm-settings-card">
            <h3 className="adm-settings-card-title">Contact form notifications</h3>
            <p className="muted small" style={{ marginBottom: 20 }}>
              When someone submits the contact form, a notification is sent to this email address.
            </p>
            <form onSubmit={handleSave} className="adm-settings-form">
              <label className="adm-settings-label">
                Admin notification email
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                  disabled={saving}
                  placeholder="admin@example.com"
                />
              </label>
              {msg && (
                <div className={msg.type === 'success' ? 'notice' : 'auth-error'} style={{ marginBottom: 4 }}>
                  {msg.text}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn" disabled={saving || !adminEmail.trim()}>
                  {saving ? 'Saving…' : 'Save settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettingsPanel;
