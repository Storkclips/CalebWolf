import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import RichTextEditor from '../RichTextEditor';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const extractPlaceholders = (text) => {
  const matches = text.matchAll(/\{\{(\w+)\}\}/g);
  const set = new Set();
  for (const m of matches) set.add(m[1]);
  return [...set];
};

const mergeTemplate = (text, values) => {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] || `{{${key}}}`);
};

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

// Format datetime-local input value from an ISO string
const toDateTimeLocal = (date) => {
  const d = new Date(date);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
};

const AdminNewsletterPanel = () => {
  const [subscribers, setSubscribers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [scheduled, setScheduled] = useState([]);
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
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const [saveTemplateDesc, setSaveTemplateDesc] = useState('');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState(''); // '', 'saving', 'saved'

  // Send mode: 'now' or 'schedule'
  const [sendMode, setSendMode] = useState('now');
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [showTestSend, setShowTestSend] = useState(false);
  const [testSending, setTestSending] = useState(false);

  useEffect(() => {
    loadSubscribers();
    loadTemplates();
    loadScheduled();
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

  const loadScheduled = async () => {
    try {
      const { data, error: err } = await supabase
        .from('newsletter_scheduled')
        .select('*')
        .order('scheduled_for', { ascending: false });
      if (err) throw err;
      setScheduled(data || []);
    } catch (err) {
      // ignore - table might not be ready yet
    }
  };

  const activeTemplate = templates.find((t) => t.id === selectedTemplateId);
  const placeholders = useMemo(() => {
    if (!activeTemplate) return [];
    return extractPlaceholders(activeTemplate.subject_template + ' ' + activeTemplate.html_template);
  }, [activeTemplate]);

  const handleSelectTemplate = (templateId) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    setSubject(tpl.subject_template || '');
    setBody(tpl.html_template || '');
    const phs = extractPlaceholders((tpl.subject_template || '') + ' ' + tpl.html_template);
    const init = {};
    phs.forEach((p) => (init[p] = ''));
    setPlaceholderValues(init);
  };

  const handleApplyPlaceholders = () => {
    if (!activeTemplate) return;
    setSubject(mergeTemplate(activeTemplate.subject_template || '', placeholderValues));
    setBody(mergeTemplate(activeTemplate.html_template, placeholderValues));
  };

  const handleInsertBasicTemplate = () => {
    setBody(BASIC_TEMPLATE);
    setSelectedTemplateId('');
  };

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token || SUPABASE_ANON_KEY}`,
    };
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    setSendResult(null);
    try {
      const headers = await getAuthHeaders();
      const payload = { subject, htmlBody: body };

      if (sendMode === 'schedule') {
        if (!scheduleDateTime) {
          setSendResult({ type: 'error', text: 'Please pick a date and time to schedule.' });
          setSending(false);
          return;
        }
        payload.scheduleFor = new Date(scheduleDateTime).toISOString();
      }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-newsletter`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Failed to send (HTTP ${res.status})`);

      if (data.scheduled) {
        const friendlyDate = new Date(data.scheduledFor).toLocaleString();
        setSendResult({ type: 'success', text: `Scheduled for ${friendlyDate}. It will be sent automatically.` });
        loadScheduled();
      } else {
        setSendResult({ type: 'success', text: `Email sent to ${data.sentTo} subscriber${data.sentTo === 1 ? '' : 's'}.` });
      }
      setSubject('');
      setBody('');
      setSelectedTemplateId('');
      setPlaceholderValues({});
      setScheduleDateTime('');
    } catch (err) {
      setSendResult({ type: 'error', text: err.message || 'Failed to send' });
    } finally {
      setSending(false);
      setTimeout(() => setSendResult(null), 6000);
    }
  };

  const handleSendTest = async () => {
    if (!testEmailAddress.trim() || !subject.trim() || !body.trim()) return;
    setTestSending(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-newsletter`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ subject, htmlBody: body, testEmail: testEmailAddress.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Failed to send preview (HTTP ${res.status})`);
      setSendResult({ type: 'success', text: `Preview email sent to ${testEmailAddress.trim()}. Check your inbox.` });
      setShowTestSend(false);
      setTestEmailAddress('');
    } catch (err) {
      setSendResult({ type: 'error', text: err.message || 'Failed to send preview' });
    } finally {
      setTestSending(false);
      setTimeout(() => setSendResult(null), 6000);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!activeTemplate) return;
    try {
      const { error: err } = await supabase.from('newsletter_templates').update({
        subject_template: subject || '',
        html_template: body,
        updated_at: new Date().toISOString(),
      }).eq('id', activeTemplate.id);
      if (err) throw err;
      setSaveMsg({ type: 'success', text: 'Template updated.' });
      loadTemplates();
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (err) {
      setSaveMsg({ type: 'error', text: err.message || 'Failed to update template' });
    }
  };

  // Autosave: when a template is selected and the user edits subject/body,
  // debounce-save the changes back to that template automatically.
  useEffect(() => {
    if (!selectedTemplateId || !subject.trim() || !body.trim()) return;
    setAutoSaveStatus('saving');
    const timer = setTimeout(async () => {
      try {
        const { error: err } = await supabase.from('newsletter_templates').update({
          subject_template: subject,
          html_template: body,
          updated_at: new Date().toISOString(),
        }).eq('id', selectedTemplateId);
        if (err) throw err;
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus(''), 2000);
      } catch {
        setAutoSaveStatus('');
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [subject, body, selectedTemplateId]);

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

  const handleSetDefaultBlog = async (id) => {
    try {
      await supabase.from('newsletter_templates').update({ is_default_blog: false }).neq('id', id);
      const { error: err } = await supabase.from('newsletter_templates').update({ is_default_blog: true }).eq('id', id);
      if (err) throw err;
      loadTemplates();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancelScheduled = async (id) => {
    if (!window.confirm('Cancel this scheduled email?')) return;
    const { error: err } = await supabase
      .from('newsletter_scheduled')
      .update({ status: 'cancelled' })
      .eq('id', id);
    if (err) { setError(err.message); return; }
    loadScheduled();
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
  const pendingScheduled = scheduled.filter((s) => s.status === 'pending');

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'rgba(10,10,16,0.4)',
    color: 'var(--text)', fontSize: 14,
  };

  const statusColors = {
    pending: '#f3d27a',
    sent: '#22c55e',
    failed: '#ef4444',
    cancelled: '#888',
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h3>Newsletter</h3>
        <p className="muted small">Compose announcements, preview, send, or schedule.</p>
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
          <p className="muted small" style={{ margin: 0, textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.06em' }}>Scheduled</p>
          <p style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 700, color: '#f3d27a' }}>{pendingScheduled.length}</p>
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
        {activeTemplate && (
          <div style={{ marginTop: 8 }}>
            <button
              className="ghost small-btn"
              onClick={() => handleSetDefaultBlog(activeTemplate.id)}
              style={activeTemplate.is_default_blog ? { borderColor: '#22c55e', background: 'rgba(34,197,94,0.1)', color: '#22c55e' } : {}}
            >
              {activeTemplate.is_default_blog ? '✓ Default for blog posts' : 'Set as default for blog posts'}
            </button>
          </div>
        )}
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
            <div className="admin-table" style={{ marginBottom: 16 }}>
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
            </div>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Compose Message</h4>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="ghost small-btn" onClick={() => setShowPreviewModal(true)} disabled={!body.trim()}>
              Preview Email
            </button>
            <button className="ghost small-btn" onClick={() => setShowTestSend(!showTestSend)} disabled={!body.trim() || !subject.trim()}>
              Send Test
            </button>
            <button className="ghost small-btn" onClick={() => setShowSaveTemplate(!showSaveTemplate)}>
              Save as New Template
            </button>
            {activeTemplate && (
              <button className="ghost small-btn" onClick={handleUpdateTemplate} disabled={!body.trim()}>
                Save Changes to This Template
              </button>
            )}
            {autoSaveStatus && (
              <span style={{ fontSize: 12, color: autoSaveStatus === 'saving' ? '#f3d27a' : '#22c55e' }}>
                {autoSaveStatus === 'saving' ? 'Saving…' : 'Auto-saved'}
              </span>
            )}
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

        {/* Test send form */}
        {showTestSend && (
          <div style={{ marginBottom: 16, padding: 16, border: '1px dashed var(--border)', borderRadius: 10, background: 'rgba(255,255,255,0.01)' }}>
            <p className="muted small" style={{ margin: '0 0 10px' }}>
              Send a preview of this email to a specific address. The subject will be prefixed with [PREVIEW].
            </p>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="email"
                placeholder="your@email.com"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                style={{ ...inputStyle, flex: 1, minWidth: 200 }}
              />
              <button
                className="btn"
                onClick={handleSendTest}
                disabled={testSending || !testEmailAddress.trim() || !subject.trim() || !body.trim()}
              >
                {testSending ? 'Sending...' : 'Send Preview'}
              </button>
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
          <RichTextEditor
            placeholder="Write your message here. Use the toolbar to format text, add links, and insert images from your gallery or blog."
            value={body}
            onChange={setBody}
          />

          {/* Send mode toggle */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', padding: '12px 0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
              <input
                type="radio"
                name="sendMode"
                value="now"
                checked={sendMode === 'now'}
                onChange={() => setSendMode('now')}
              />
              Send Now
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
              <input
                type="radio"
                name="sendMode"
                value="schedule"
                checked={sendMode === 'schedule'}
                onChange={() => setSendMode('schedule')}
              />
              Schedule for Later
            </label>
          </div>

          {/* Schedule datetime picker */}
          {sendMode === 'schedule' && (
            <div style={{ padding: 16, border: '1px dashed var(--border)', borderRadius: 10, background: 'rgba(255,255,255,0.01)' }}>
              <label style={{ fontSize: 13, color: '#f3d27a', display: 'block', marginBottom: 8 }}>
                When should this email be sent?
              </label>
              <input
                type="datetime-local"
                value={scheduleDateTime}
                onChange={(e) => setScheduleDateTime(e.target.value)}
                style={inputStyle}
                min={toDateTimeLocal(new Date())}
              />
              <p className="muted small" style={{ margin: '8px 0 0' }}>
                The email will be sent automatically at this time. You can cancel it before it sends.
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              className="btn"
              onClick={handleSend}
              disabled={sending || !subject.trim() || !body.trim() || (sendMode === 'schedule' && !scheduleDateTime)}
            >
              {sending ? 'Working...' : sendMode === 'schedule' ? 'Schedule Email' : 'Send to all subscribers'}
            </button>
            <span className="muted small">
              {sendMode === 'schedule'
                ? 'Will be sent automatically at the scheduled time'
                : `Sends to ${activeCount} active subscriber${activeCount === 1 ? '' : 's'}`
              }
            </span>
          </div>
          {sendResult && (
            <p style={{ margin: '4px 0 0', fontSize: 13, color: sendResult.type === 'success' ? '#22c55e' : '#f59e0b' }}>
              {sendResult.text}
            </p>
          )}
        </div>
      </div>

      {/* Scheduled emails list */}
      {scheduled.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h4 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>Scheduled &amp; Sent Emails</h4>
          <div className="admin-table">
            <div className="admin-table-header">
              <div className="admin-table-cell">Subject</div>
              <div className="admin-table-cell">Scheduled For</div>
              <div className="admin-table-cell">Status</div>
              <div className="admin-table-cell">Actions</div>
            </div>
            {scheduled.map((item) => (
              <div key={item.id} className="admin-table-row">
                <div className="admin-table-cell" style={{ fontWeight: 600 }}>{item.subject}</div>
                <div className="admin-table-cell muted small">
                  {new Date(item.scheduled_for).toLocaleString()}
                </div>
                <div className="admin-table-cell">
                  <span style={{ color: statusColors[item.status] || '#888', textTransform: 'capitalize' }}>
                    {item.status}
                  </span>
                  {item.recipient_count != null && item.status === 'sent' && (
                    <span className="muted" style={{ fontSize: 11, marginLeft: 6 }}>
                      ({item.recipient_count} recipients)
                    </span>
                  )}
                  {item.error_message && item.status === 'failed' && (
                    <div className="muted" style={{ fontSize: 11, marginTop: 4, color: '#ef4444' }}>
                      {item.error_message}
                    </div>
                  )}
                </div>
                <div className="admin-table-cell">
                  {item.status === 'pending' && (
                    <button className="ghost small-btn" onClick={() => handleCancelScheduled(item.id)}>
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* Preview Modal */}
      {showPreviewModal && (
        <div
          onClick={() => setShowPreviewModal(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#12121a', borderRadius: 16, maxWidth: 700, width: '100%',
              maxHeight: '85vh', display: 'flex', flexDirection: 'column',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px 20px', borderBottom: '1px solid var(--border)',
            }}>
              <div>
                <p className="muted" style={{ margin: 0, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Subject</p>
                <p style={{ margin: '4px 0 0', fontSize: 15, fontWeight: 600 }}>{subject || '(no subject)'}</p>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                style={{
                  background: 'none', border: 'none', color: 'var(--text)',
                  fontSize: 22, cursor: 'pointer', padding: '4px 8px', lineHeight: 1,
                }}
              >
                &times;
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 0 }}>
              {body ? (
                <div dangerouslySetInnerHTML={{ __html: body }} />
              ) : (
                <p className="muted" style={{ padding: 40, textAlign: 'center' }}>Nothing to preview yet.</p>
              )}
            </div>
            <div style={{
              padding: '12px 20px', borderTop: '1px solid var(--border)',
              display: 'flex', gap: 10, justifyContent: 'flex-end',
            }}>
              <button className="ghost small-btn" onClick={() => setShowPreviewModal(false)}>
                Close
              </button>
              <button
                className="btn"
                onClick={() => {
                  setShowPreviewModal(false);
                  setShowTestSend(true);
                }}
                disabled={!body.trim() || !subject.trim()}
              >
                Send a Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNewsletterPanel;
