import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Extract {{placeholders}} from a string
const extractPlaceholders = (text) => {
  const matches = text.matchAll(/\{\{(\w+)\}\}/g);
  const set = new Set();
  for (const m of matches) set.add(m[1]);
  return [...set];
};

// Replace {{placeholders}} using a values map
const mergeTemplate = (text, values) => {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] || `{{${key}}}`);
};

// Basic HTML guide content shown in a collapsible section
const HTML_GUIDE = [
  { tag: '<h1>...</h1>', desc: 'Large heading' },
  { tag: '<h2>...</h2>', desc: 'Medium heading' },
  { tag: '<p>...</p>', desc: 'Paragraph text' },
  { tag: '<a href="...">text</a>', desc: 'Clickable link' },
  { tag: '<strong>...</strong>', desc: 'Bold text' },
  { tag: '<em>...</em>', desc: 'Italic text' },
  { tag: '<img src="..." />', desc: 'Image (use a hosted URL)' },
  { tag: '<ul><li>...</li></ul>', desc: 'Bullet list' },
  { tag: '<table>...</table>', desc: 'Table layout (recommended for email structure)' },
];

const BASIC_TEMPLATE = `<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a10;padding:40px 0;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#12121a;border-radius:16px;">
      <tr><td style="padding:48px;">
        <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:24px;color:#fff;">Your Title Here</h1>
        <p style="margin:0 0 24px;font-size:15px;color:#aaa;line-height:1.7;">
          Write your message here. Keep paragraphs short for readability.
        </p>
        <a href="https://calebwolfphotography.com"
           style="display:inline-block;background:#f3d27a;color:#0a0a10;font-weight:700;font-size:15px;padding:14px 36px;border-radius:8px;text-decoration:none;">
          Button Text
        </a>
      </td></tr>
    </table>
  </td></tr>
</table>`;

const AdminNewsletterPanel = () => {
  const [subscribers, setSubscribers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [filter, setFilter] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [placeholderValues, setPlaceholderValues] = useState({});
  const [showHtmlGuide, setShowHtmlGuide] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const [saveTemplateDesc, setSaveTemplateDesc] = useState('');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);

  useEffect(() => {
    loadSubscribers();
    loadTemplates();
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

  const loadTemplates = async () => {
    try {
      const { data, error: err } = await supabase
        .from('newsletter_templates')
        .select('*')
        .order('is_premade', { ascending: false })
        .order('created_at', { ascending: true });
      if (err) throw err;
      setTemplates(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load templates');
    }
  };

  const activeTemplate = templates.find((t) => t.id === selectedTemplateId);
  const placeholders = useMemo(() => {
    if (!activeTemplate) return [];
    return extractPlaceholders(activeTemplate.subject_template + ' ' + activeTemplate.html_template);
  }, [activeTemplate]);

  // When a template is selected, load it into the editor
  const handleSelectTemplate = (templateId) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    setSubject(tpl.subject_template || '');
    setBody(tpl.html_template || '');
    // Initialize placeholder values as empty
    const phs = extractPlaceholders((tpl.subject_template || '') + ' ' + tpl.html_template);
    const init = {};
    phs.forEach((p) => (init[p] = ''));
    setPlaceholderValues(init);
  };

  // Apply placeholder values to the current subject/body
  const handleApplyPlaceholders = () => {
    if (!activeTemplate) return;
    setSubject(mergeTemplate(activeTemplate.subject_template || '', placeholderValues));
    setBody(mergeTemplate(activeTemplate.html_template, placeholderValues));
  };

  // Insert the basic HTML template into the body
  const handleInsertBasicTemplate = () => {
    setBody(BASIC_TEMPLATE);
    setSelectedTemplateId('');
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
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Failed to send (HTTP ${res.status})`);
      setSendResult({ type: 'success', text: `Email sent to ${data.sentTo} subscriber${data.sentTo === 1 ? '' : 's'}.` });
      setSubject('');
      setBody('');
      setSelectedTemplateId('');
      setPlaceholderValues({});
    } catch (err) {
      setSendResult({ type: 'error', text: err.message || 'Failed to send' });
    } finally {
      setSending(false);
      setTimeout(() => setSendResult(null), 5000);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!saveTemplateName.trim() || !body.trim()) return;
    try {
      const { error: err } = await supabase.from('newsletter_templates').insert({
        name: saveTemplateName.trim(),
        description: saveTemplateDesc.trim() || '',
        subject_template: subject || '',
        html_template: body,
        is_premade: false,
      });
      if (err) throw err;
      setSaveMsg({ type: 'success', text: 'Template saved.' });
      setSaveTemplateName('');
      setSaveTemplateDesc('');
      setShowSaveTemplate(false);
      loadTemplates();
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (err) {
      setSaveMsg({ type: 'error', text: err.message || 'Failed to save template' });
    }
  };

  const handleDeleteTemplate = async (id) => {
    const tpl = templates.find((t) => t.id === id);
    if (tpl?.is_premade) {
      window.alert('Premade templates cannot be deleted.');
      return;
    }
    if (!window.confirm('Delete this template?')) return;
    const { error: err } = await supabase.from('newsletter_templates').delete().eq('id', id);
    if (err) { setError(err.message); return; }
    if (selectedTemplateId === id) setSelectedTemplateId('');
    loadTemplates();
  };

  const handleRemove = async (id) => {
    if (!window.confirm('Remove this subscriber?')) return;
    const { error: err } = await supabase.from('newsletter_subscribers').delete().eq('id', id);
    if (err) { setError(err.message); return; }
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

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'rgba(10,10,16,0.4)',
    color: 'var(--text)', fontSize: 14,
  };

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

      {/* Template selector */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 14, padding: 20, marginBottom: 16, background: 'rgba(255,255,255,0.02)' }}>
        <h4 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>Choose a Template</h4>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          <button
            className="ghost small-btn"
            onClick={handleInsertBasicTemplate}
            style={selectedTemplateId === '' && body === BASIC_TEMPLATE ? { borderColor: '#f3d27a' } : {}}
          >
            Blank (HTML)
          </button>
          {templates.map((tpl) => (
            <button
              key={tpl.id}
              className="ghost small-btn"
              onClick={() => handleSelectTemplate(tpl.id)}
              style={selectedTemplateId === tpl.id ? { borderColor: '#f3d27a', background: 'rgba(243,210,122,0.1)' } : {}}
            >
              {tpl.name}
              {tpl.is_premade && <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.6 }}>premade</span>}
            </button>
          ))}
        </div>
        {activeTemplate && (
          <p className="muted small" style={{ margin: '0 0 8px' }}>{activeTemplate.description}</p>
        )}
        {/* Template management: delete custom templates */}
        {templates.filter((t) => !t.is_premade).length > 0 && (
          <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="muted" style={{ fontSize: 12, lineHeight: '28px' }}>Custom templates:</span>
            {templates.filter((t) => !t.is_premade).map((tpl) => (
              <span key={tpl.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span className="muted" style={{ fontSize: 12 }}>{tpl.name}</span>
                <button className="ghost small-btn" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => handleDeleteTemplate(tpl.id)}>Delete</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Placeholder fields */}
      {placeholders.length > 0 && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 14, padding: 20, marginBottom: 16, background: 'rgba(255,255,255,0.02)' }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700 }}>Fill in Template Fields</h4>
          <p className="muted small" style={{ margin: '0 0 12px' }}>This template uses placeholders. Fill them in, then click Apply.</p>
          <div style={{ display: 'grid', gap: 10 }}>
            {placeholders.map((ph) => (
              <div key={ph} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <label style={{ fontSize: 13, minWidth: 160, color: '#f3d27a', fontFamily: 'monospace' }}>{`{{${ph}}}`}</label>
                <input
                  type="text"
                  placeholder={`Value for ${ph}`}
                  value={placeholderValues[ph] || ''}
                  onChange={(e) => setPlaceholderValues({ ...placeholderValues, [ph]: e.target.value })}
                  style={inputStyle}
                />
              </div>
            ))}
          </div>
          <button className="btn" style={{ marginTop: 12 }} onClick={handleApplyPlaceholders}>
            Apply Values to Email
          </button>
        </div>
      )}

      {/* HTML Guide */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 14, padding: 20, marginBottom: 16, background: 'rgba(255,255,255,0.02)' }}>
        <button
          onClick={() => setShowHtmlGuide(!showHtmlGuide)}
          style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: 14, fontWeight: 700, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <span style={{ display: 'inline-block', transform: showHtmlGuide ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>&#9654;</span>
          HTML Guide &amp; Basic Template
        </button>
        {showHtmlGuide && (
          <div style={{ marginTop: 16 }}>
            <p className="muted small" style={{ margin: '0 0 12px' }}>
              The email body accepts raw HTML. Use table-based layouts for best email client compatibility.
              Avoid &lt;style&gt; tags and external CSS — use inline styles instead.
            </p>
            <table className="admin-table" style={{ marginBottom: 16 }}>
              <div className="admin-table-header">
                <div className="admin-table-cell">Tag</div>
                <div className="admin-table-cell">What it does</div>
              </div>
              {HTML_GUIDE.map((item) => (
                <div key={item.tag} className="admin-table-row">
                  <div className="admin-table-cell" style={{ fontFamily: 'monospace', fontSize: 13, color: '#f3d27a' }}>{item.tag}</div>
                  <div className="admin-table-cell muted small">{item.desc}</div>
                </div>
              ))}
            </table>
            <p className="muted small" style={{ margin: '0 0 8px' }}>Basic template to get started:</p>
            <pre style={{
              background: 'rgba(0,0,0,0.4)', padding: 16, borderRadius: 8, overflow: 'auto',
              fontSize: 12, fontFamily: 'monospace', color: '#ccc', lineHeight: 1.5,
              border: '1px solid var(--border)',
            }}>{BASIC_TEMPLATE}</pre>
            <button className="ghost small-btn" style={{ marginTop: 8 }} onClick={handleInsertBasicTemplate}>
              Insert this into editor
            </button>
          </div>
        )}
      </div>

      {/* Compose form */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 14, padding: 20, marginBottom: 16, background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Compose Message</h4>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="ghost small-btn" onClick={() => setShowPreview(!showPreview)}>
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </button>
            <button className="ghost small-btn" onClick={() => setShowSaveTemplate(!showSaveTemplate)}>
              Save as Template
            </button>
          </div>
        </div>

        {/* Save as template form */}
        {showSaveTemplate && (
          <div style={{ marginBottom: 16, padding: 16, border: '1px dashed var(--border)', borderRadius: 10, background: 'rgba(255,255,255,0.01)' }}>
            <div style={{ display: 'grid', gap: 10 }}>
              <input
                type="text"
                placeholder="Template name (e.g. Holiday Sale)"
                value={saveTemplateName}
                onChange={(e) => setSaveTemplateName(e.target.value)}
                style={inputStyle}
              />
              <input
                type="text"
                placeholder="Short description (optional)"
                value={saveTemplateDesc}
                onChange={(e) => setSaveTemplateDesc(e.target.value)}
                style={inputStyle}
              />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button className="btn" onClick={handleSaveAsTemplate} disabled={!saveTemplateName.trim() || !body.trim()}>
                  Save Template
                </button>
                {saveMsg && (
                  <span style={{ fontSize: 13, color: saveMsg.type === 'success' ? '#22c55e' : '#f59e0b' }}>{saveMsg.text}</span>
                )}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gap: 12 }}>
          <input
            type="text"
            placeholder="Email subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            style={inputStyle}
          />
          <textarea
            placeholder="Write your message here. HTML is supported."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            style={{ ...inputStyle, fontFamily: 'monospace', lineHeight: 1.6, resize: 'vertical' }}
          />

          {/* Live preview */}
          {showPreview && body && (
            <div style={{ marginTop: 4 }}>
              <p className="muted small" style={{ margin: '0 0 8px' }}>Preview:</p>
              <div style={{
                border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto',
                background: '#0a0a10', maxHeight: 400,
              }}>
                <div dangerouslySetInnerHTML={{ __html: body }} />
              </div>
            </div>
          )}

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
