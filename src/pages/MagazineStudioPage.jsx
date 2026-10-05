import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { supabase } from '../lib/supabase';
import { serializeStudioPage } from '../lib/magazines';
import '../styles/magazineStudio.css';

let msgId = 0;

const pageCount = (project) => Math.max(4, project?.pages?.length || 0);

const slugify = (s) => (s || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'untitled';

async function syncMagazinePages(magazineId, project) {
  const studioPages = project.pages || [];
  const pageRows = studioPages.map((p, i) => serializeStudioPage(p, i, magazineId));

  // Upsert pages one row per request: a single page can exceed 1MB, so a
  // multi-row insert blows past the request size limit and fails after the
  // delete already ran, destroying the saved pages.
  for (const row of pageRows) {
    const { error } = await supabase
      .from('magazine_pages')
      .upsert(row, { onConflict: 'magazine_id,page_number' });
    if (error) throw error;
  }

  // Drop rows left over from a previously longer edition.
  if (pageRows.length) {
    const { error } = await supabase
      .from('magazine_pages')
      .delete()
      .eq('magazine_id', magazineId)
      .gt('page_number', pageRows.length);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('magazine_pages')
      .delete()
      .eq('magazine_id', magazineId);
    if (error) throw error;
  }
}

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
  const handleSaveRef = useRef(null);
  const handlePublishRef = useRef(null);
  const handleNewRef = useRef(null);
  const currentMagId = useRef(null);
  const projectLoading = useRef(false);

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

  useEffect(() => {
    if (!loading && (!user || !profile?.is_admin)) navigate('/');
  }, [user, profile, loading, navigate]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    function onMessage(e) {
      const { type, id, data, error } = e.data || {};
      if (type === 'editorReady') {
        setEditorReady(true);
        supabase
          .from('magazines')
          .select('id, title, page_count, cover_url, status, saved_at, updated_at')
          .order('updated_at', { ascending: false })
          .then(({ data }) => {
            frameRef.current?.contentWindow?.postMessage({ type: 'siteProjects', projects: data || [] }, '*');
          });
        return;
      }
      if (type === 'editorSave') { handleSaveRef.current?.(); return; }
      if (type === 'editorPublish') { handlePublishRef.current?.(); return; }
      if (type === 'editorNew') { handleNewRef.current?.(); return; }
      if (type === 'editorOpenProject' && e.data.projectId) {
        navigate(`/magazine-studio/${e.data.projectId}`);
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
  }, [navigate]);

  useEffect(() => {
    if (!editorReady) return;
    (async () => {
      projectLoading.current = true;
      if (projectId) {
        currentMagId.current = projectId;
        const { data: mag, error: magError } = await supabase
          .from('magazines')
          .select('*')
          .eq('id', projectId)
          .maybeSingle();
        if (magError) {
          setSaveStatus('failed');
          setSaveNotice('Load failed: ' + (magError.message || 'unknown'));
          projectLoading.current = false;
          return;
        }
        if (!mag) {
          setSaveStatus('failed');
          setSaveNotice('Magazine not found (id: ' + projectId + ')');
          projectLoading.current = false;
          return;
        }
        const project = mag?.project_json;
        if (project && project.pages && project.settings) {
          try {
            await loadProjectIntoEditor(project);
            setSaveStatus('idle');
            setSaveNotice('');
          } catch (e) {
            console.error('load failed', e);
            setSaveStatus('failed');
            setSaveNotice('Editor load failed: ' + (e.message || 'unknown'));
          }
        } else if (project && (!project.pages || !project.settings)) {
          setSaveStatus('failed');
          setSaveNotice('Saved project data is incomplete — starting blank.');
          try { await newProjectInEditor(); } catch (e) { console.error('new project failed', e); }
        } else {
          try { await newProjectInEditor(); } catch (e) { console.error('new project failed', e); }
        }
      } else {
        currentMagId.current = null;
        try { await newProjectInEditor(); } catch (e) { console.error('new project failed', e); }
      }
      projectLoading.current = false;
    })();
  }, [editorReady, projectId, loadProjectIntoEditor, newProjectInEditor]);

  const handleSave = useCallback(async () => {
    setSaveStatus('saving');
    setSaveNotice('');
    try {
      const project = await getProjectFromEditor();
      if (!project) { setSaveStatus('failed'); setSaveNotice('No project data'); return; }

      const now = new Date().toISOString();
      const payload = {
        title: project.title || 'Untitled Magazine',
        page_count: pageCount(project),
        project_json: project,
        saved_at: now,
        updated_at: now,
      };

      let magId = currentMagId.current;
      if (!magId) {
        const { data: newMag, error } = await supabase
          .from('magazines')
          .insert({ ...payload, slug: `${slugify(project.title)}-${Date.now().toString(36)}`, status: 'draft' })
          .select()
          .maybeSingle();
        if (error) throw error;
        magId = newMag.id;
        currentMagId.current = magId;
        if (!projectId) navigate(`/magazine-studio/${magId}`, { replace: true });
      } else {
        const { error } = await supabase.from('magazines').update(payload).eq('id', magId);
        if (error) throw error;
      }

      await syncMagazinePages(magId, project);

      setSaveStatus('saved');
      setSaveNotice('Saved ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
    } catch (err) {
      setSaveStatus('failed');
      setSaveNotice('Save failed: ' + (err.message || 'unknown'));
    }
  }, [getProjectFromEditor, navigate, projectId]);

  const handlePublish = useCallback(async () => {
    setSaveStatus('saving');
    setSaveNotice('');
    try {
      const project = await getProjectFromEditor();
      if (!project) { setSaveStatus('failed'); setSaveNotice('No project data'); return; }

      const coverUrl = project.pages?.[0]?.thumb || '';
      const now = new Date().toISOString();
      const payload = {
        title: project.title || 'Untitled Magazine',
        page_count: pageCount(project),
        project_json: project,
        cover_url: coverUrl,
        status: 'published',
        published_at: now,
        saved_at: now,
        updated_at: now,
      };

      let magId = currentMagId.current;
      if (!magId) {
        const { data: newMag, error } = await supabase
          .from('magazines')
          .insert({ ...payload, slug: `${slugify(project.title)}-${Date.now().toString(36)}` })
          .select()
          .maybeSingle();
        if (error) throw error;
        magId = newMag.id;
        currentMagId.current = magId;
        if (!projectId) navigate(`/magazine-studio/${magId}`, { replace: true });
      } else {
        const { error } = await supabase.from('magazines').update(payload).eq('id', magId);
        if (error) throw error;
      }

      await syncMagazinePages(magId, project);

      setSaveStatus('saved');
      setSaveNotice('Published');
    } catch (err) {
      setSaveStatus('failed');
      setSaveNotice('Publish failed: ' + (err.message || 'unknown'));
    }
  }, [getProjectFromEditor, navigate, projectId]);

  const handleNew = useCallback(async () => {
    if (!confirm('Create a new magazine? Unsaved changes will be lost.')) return;
    currentMagId.current = null;
    setSaveStatus('idle');
    setSaveNotice('');
    navigate('/magazine-studio', { replace: true });
  }, [navigate]);

  handleSaveRef.current = handleSave;
  handlePublishRef.current = handlePublish;
  handleNewRef.current = handleNew;

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
