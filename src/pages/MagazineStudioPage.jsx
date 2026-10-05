import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { supabase, proxyImageUrl } from '../lib/supabase';
import '../styles/magazineStudio.css';

let msgId = 0;

const pageCount = (project) => Math.max(4, project?.pages?.length || 0);

export default function MagazineStudioPage() {
  const frameRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [saveNotice, setSaveNotice] = useState('');
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { projectId } = useParams();
  const pendingPromises = useRef({});

  const sendToEditor = useCallback((type, extra = {}) => {
    const id = ++msgId;
    return new Promise((resolve, reject) => {
      pendingPromises.current[id] = { resolve, reject };
      frameRef.current?.contentWindow?.postMessage({ type, id, ...extra }, '*');
      setTimeout(() => {
        if (pendingPromises.current[id]) {
          pendingPromises.current[id].reject(new Error('Editor response timeout'));
          delete pendingPromises.current[id];
        }
      }, 15000);
    });
  }, []);

  const getProjectFromEditor = useCallback(() => sendToEditor('getProjectData'), [sendToEditor]);

  const loadProjectIntoEditor = useCallback((project) => sendToEditor('loadProject', { project }), [sendToEditor]);

  const newProjectInEditor = useCallback(() => sendToEditor('newProject'), [sendToEditor]);

  // Auth guard
  useEffect(() => {
    if (!loading && (!user || !profile?.is_admin)) navigate('/');
  }, [user, profile, loading, navigate]);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Listen for messages from the editor iframe
  useEffect(() => {
    function onMessage(e) {
      const { type, id, data, error } = e.data || {};
      if (type === 'editorReady') {
        setEditorReady(true);
        return;
      }
      if (id && pendingPromises.current[id]) {
        if (error) pendingPromises.current[id].reject(new Error(error));
        else pendingPromises.current[id].resolve(data);
        delete pendingPromises.current[id];
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Load a magazine from Supabase when projectId is in the URL,
  // or initialize a fresh project when no projectId is given
  useEffect(() => {
    if (!editorReady) return;
    (async () => {
      projectLoading.current = true;
      if (projectId) {
        const { data: mag } = await supabase
          .from('magazines')
          .select('*')
          .eq('id', projectId)
          .maybeSingle();
        const project = mag?.autosave_json || mag?.project_json;
        if (project) {
          try { await loadProjectIntoEditor(project); } catch (e) { console.error('load failed', e); }
          lastAutosaveJson.current = JSON.stringify(project);
        } else {
          try { await newProjectInEditor(); } catch (e) { console.error('new project failed', e); }
        }
      } else {
        try { await newProjectInEditor(); } catch (e) { console.error('new project failed', e); }
      }
      projectLoading.current = false;
    })();
  }, [editorReady, projectId, loadProjectIntoEditor, newProjectInEditor]);

  // Autosave: poll the editor every 3s for project data and save to Supabase
  const currentMagId = useRef(null);
  const lastAutosaveJson = useRef('');
  const autosaveTimer = useRef(null);
  const projectLoading = useRef(false);

  useEffect(() => {
    if (!editorReady) return;
    const startTimer = setTimeout(() => {
      autosaveTimer.current = setInterval(async () => {
        if (projectLoading.current) return;
      try {
        const project = await getProjectFromEditor();
        if (!project) return;
        const json = JSON.stringify(project);
        if (json === lastAutosaveJson.current) return;
        lastAutosaveJson.current = json;

        // If we don't have a magazine record yet, create one
        if (!currentMagId.current) {
          const slug = (project.title || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'untitled';
          const { data: newMag, error } = await supabase
            .from('magazines')
            .insert({
              title: project.title || 'Untitled Magazine',
              slug: `${slug}-${Date.now().toString(36)}`,
              status: 'draft',
              page_count: pageCount(project),
              autosave_json: project,
              autosaved_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select()
            .maybeSingle();
          if (error) { setSaveStatus('failed'); setSaveNotice('Autosave: ' + error.message); return; }
          currentMagId.current = newMag.id;
        } else {
          const { error: updError } = await supabase
            .from('magazines')
            .update({
              autosave_json: project,
              autosaved_at: new Date().toISOString(),
              page_count: pageCount(project),
              updated_at: new Date().toISOString(),
            })
            .eq('id', currentMagId.current);
          if (updError) { setSaveStatus('failed'); setSaveNotice('Autosave: ' + updError.message); return; }
        }
        setSaveStatus('autosaved');
      } catch (err) {
        console.error('autosave error', err);
        setSaveStatus('failed');
        setSaveNotice('Autosave error: ' + (err.message || 'unknown'));
      }
      }, 3000);
    }, 1500);
    return () => { clearTimeout(startTimer); clearInterval(autosaveTimer.current); };
  }, [editorReady, getProjectFromEditor]);

  // If we navigated with a projectId, set currentMagId
  useEffect(() => {
    if (projectId) currentMagId.current = projectId;
  }, [projectId]);

  // Save (Ctrl+S equivalent) — saves a permanent revision
  const handleSave = useCallback(async () => {
    setSaveStatus('saving');
    setSaveNotice('');
    try {
      const project = await getProjectFromEditor();
      if (!project) { setSaveStatus('failed'); setSaveNotice('No project data'); return; }

      const slug = (project.title || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'untitled';

      if (!currentMagId.current) {
        const { data: newMag, error } = await supabase
          .from('magazines')
          .insert({
            title: project.title || 'Untitled Magazine',
            slug: `${slug}-${Date.now().toString(36)}`,
            status: 'draft',
            page_count: pageCount(project),
            project_json: project,
            autosave_json: project,
            autosaved_at: new Date().toISOString(),
            saved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .maybeSingle();
        if (error) throw error;
        currentMagId.current = newMag.id;
      } else {
        const { error } = await supabase
          .from('magazines')
          .update({
            title: project.title || 'Untitled Magazine',
            project_json: project,
            autosave_json: project,
            autosaved_at: new Date().toISOString(),
            saved_at: new Date().toISOString(),
            page_count: pageCount(project),
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentMagId.current);
        if (error) throw error;
      }

      lastAutosaveJson.current = JSON.stringify(project);
      setSaveStatus('saved');
      setSaveNotice('Saved ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
    } catch (err) {
      setSaveStatus('failed');
      setSaveNotice('Save failed: ' + (err.message || 'unknown'));
    }
  }, [getProjectFromEditor]);

  // Publish — saves and sets status to published
  const handlePublish = useCallback(async () => {
    setSaveStatus('saving');
    setSaveNotice('');
    try {
      const project = await getProjectFromEditor();
      if (!project) { setSaveStatus('failed'); return; }

      // Generate cover thumbnail from first page
      let coverUrl = '';
      const firstPage = project.pages?.[0];
      if (firstPage?.thumb) coverUrl = firstPage.thumb;

      const slug = (project.title || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'untitled';
      const pageCnt = pageCount(project);

      if (!currentMagId.current) {
        const { data: newMag, error } = await supabase
          .from('magazines')
          .insert({
            title: project.title || 'Untitled Magazine',
            slug: `${slug}-${Date.now().toString(36)}`,
            status: 'published',
            page_count: pageCnt,
            cover_url: coverUrl,
            project_json: project,
            autosave_json: project,
            autosaved_at: new Date().toISOString(),
            saved_at: new Date().toISOString(),
            published_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .maybeSingle();
        if (error) throw error;
        currentMagId.current = newMag.id;
      } else {
        const { error } = await supabase
          .from('magazines')
          .update({
            title: project.title || 'Untitled Magazine',
            project_json: project,
            autosave_json: project,
            cover_url: coverUrl,
            page_count: pageCnt,
            status: 'published',
            published_at: new Date().toISOString(),
            saved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentMagId.current);
        if (error) throw error;
      }

      lastAutosaveJson.current = JSON.stringify(project);
      setSaveStatus('saved');
      setSaveNotice('Published');
    } catch (err) {
      setSaveStatus('failed');
      setSaveNotice('Publish failed: ' + (err.message || 'unknown'));
    }
  }, [getProjectFromEditor]);

  // New magazine
  const handleNew = useCallback(async () => {
    if (!confirm('Create a new magazine? Unsaved changes will be lost.')) return;
    currentMagId.current = null;
    lastAutosaveJson.current = '';
    setSaveStatus('idle');
    setSaveNotice('');
    try { await newProjectInEditor(); } catch {}
  }, [newProjectInEditor]);

  // Ctrl+S handler
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSave]);

  if (loading || !user || !profile?.is_admin) {
    return (
      <main className="magazine-studio-page">
        <div className="magazine-studio-loading">Checking access…</div>
      </main>
    );
  }

  const statusLabel = {
    idle: '',
    saving: 'Saving…',
    autosaved: 'Autosaved',
    saved: 'Saved',
    failed: 'Save failed',
  }[saveStatus] || '';

  return (
    <main className="magazine-studio-page">
      <div className="magazine-studio-sitebar magazine-studio-sitebar--with-actions">
        <div className="magazine-studio-sitebar-left">
          <Link to="/admin" className="magazine-studio-sitebar__link">
            ← Admin
          </Link>
          <span className="magazine-studio-sitebar-title">Magazine Studio</span>
          {statusLabel && (
            <span className={`magazine-studio-save-status magazine-studio-save-status--${saveStatus}`}>
              {statusLabel}
            </span>
          )}
          {saveNotice && <span className="magazine-studio-save-notice">{saveNotice}</span>}
        </div>
        <div className="magazine-studio-sitebar-actions">
          <button className="magazine-studio-btn magazine-studio-btn--ghost" type="button" onClick={handleNew}>
            New
          </button>
          <button className="magazine-studio-btn magazine-studio-btn--ghost" type="button" onClick={handleSave}>
            Save
          </button>
          <button className="magazine-studio-btn magazine-studio-btn--primary" type="button" onClick={handlePublish}>
            Publish
          </button>
        </div>
      </div>

      {!loaded ? (
        <div className="magazine-studio-loading">Loading Magazine Studio…</div>
      ) : null}

      <iframe
        ref={frameRef}
        className={`magazine-studio-frame${loaded ? ' is-loaded' : ''}`}
        src="/magazine-studio/editor.html?embedded=1"
        title="Magazine Studio"
        onLoad={() => setLoaded(true)}
        allow="clipboard-read; clipboard-write; fullscreen"
      />
    </main>
  );
}
