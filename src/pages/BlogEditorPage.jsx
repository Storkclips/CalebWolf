import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { formatDate, getBlogPosts, createBlogPost, updateBlogPost, deleteBlogPost, renderBlogContent, slugify } from '../utils/blog';

const emptyForm = {
  id: '',
  title: '',
  date: '',
  excerpt: '',
  tag: '',
  contentHtml: '',
  authorName: '',
  authorInitials: '',
  publishDate: '',
  readTime: '',
  lastEdited: '',
  scheduledAt: '',
  images: [],
  published: false,
};

const createBlockId = () => `block-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const parseContentBlocks = (value) => {
  if (!value) return [{ id: createBlockId(), type: 'paragraph', text: '' }];
  const parts = value.split(/(<image-grid:[^>]+>|<image:[^>]+>)/gi);
  const blocks = [];
  parts.forEach((part) => {
    if (!part) return;
    const gridMatch = part.match(/<image-grid:([^>]+)>/i);
    if (gridMatch) {
      const [layoutPart = '', ...segments] = gridMatch[1].split('|');
      const [colsValue, rowsValue] = layoutPart.split('x').map((item) => Number(item.trim()));
      const columns = Number.isFinite(colsValue) && colsValue > 0 ? colsValue : 2;
      const rows = Number.isFinite(rowsValue) && rowsValue > 0 ? rowsValue : 2;
      let tokensPart = '', textPart = '', captionPart = '';
      segments.forEach((segment) => {
        if (!segment) return;
        if (segment.startsWith('tokens=')) { tokensPart = segment.replace('tokens=', ''); return; }
        if (segment.startsWith('text=')) { textPart = segment.replace('text=', ''); return; }
        if (segment.startsWith('caption=')) { captionPart = segment.replace('caption=', ''); return; }
        if (!tokensPart) { tokensPart = segment; return; }
        captionPart = captionPart ? `${captionPart}|${segment}` : segment;
      });
      const tokens = tokensPart.split(',').map((t) => t.trim()).filter(Boolean);
      const texts = textPart.split(',').map((e) => e.trim()).filter(Boolean).map((e) => decodeURIComponent(e));
      const caption = decodeURIComponent(captionPart || '').trim();
      blocks.push({ id: createBlockId(), type: 'image-grid', columns, rows, tokens, caption, texts });
      return;
    }
    const imageMatch = part.match(/<image:([^>]+)>/i);
    if (imageMatch) {
      blocks.push({ id: createBlockId(), type: 'image', token: imageMatch[1].trim() });
      return;
    }
    const trimmed = part.replace(/^\n+|\n+$/g, '');
    if (!trimmed) return;
    trimmed.split(/\n{2,}/g).forEach((paragraph) => {
      blocks.push({ id: createBlockId(), type: 'paragraph', text: paragraph });
    });
  });
  return blocks.length ? blocks : [{ id: createBlockId(), type: 'paragraph', text: '' }];
};

const formatBlocksToContent = (blocks) =>
  blocks
    .map((block) => {
      if (block.type === 'image') return block.token ? `<image:${block.token}>` : '';
      if (block.type === 'image-grid') {
        const layout = `${block.columns}x${block.rows}`;
        const tokens = (block.tokens ?? []).filter(Boolean).join(', ');
        const texts = (block.texts ?? []).filter((e) => e && e.trim()).map((e) => encodeURIComponent(e)).join(', ');
        const caption = block.caption ? `|caption=${encodeURIComponent(block.caption)}` : '';
        const tokensSegment = tokens ? `|tokens=${tokens}` : '';
        const textSegment = texts ? `|text=${texts}` : '';
        return `<image-grid:${layout}${tokensSegment}${textSegment}${caption}>`;
      }
      return block.text ?? '';
    })
    .filter((v) => v.trim() !== '')
    .join('\n\n');

const normalizeImages = (images = []) =>
  images.map((image) => ({
    ...image,
    focusX: image.focusX ?? 50,
    focusY: image.focusY ?? 50,
    altText: image.altText ?? '',
    caption: image.caption ?? '',
    linkUrl: image.linkUrl ?? '',
    openInNewTab: image.openInNewTab ?? false,
  }));

const formatFullDate = () =>
  new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

const deriveReadTime = (content, fallback) => {
  if (fallback) return fallback;
  const wordCount = (content ?? '')
    .replace(/<image:[^>]+>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
};

const findImageByToken = (images, token) => {
  if (!token) return null;
  const normalized = token.trim().toLowerCase();
  return (
    images?.find((image) => image.id.toLowerCase() === normalized) ??
    images?.find((image) => image.title.toLowerCase() === normalized)
  );
};

// ── Image panel (hover-reveal left drawer) ───────────────────────────────────
function ImagePanel({ images, usageCounts, onSettings }) {
  return (
    <div className="img-panel-inner">
      <div className="img-panel-header">
        <span className="img-panel-heading">Images</span>
        <span className="muted small">{images.length}</span>
      </div>
      {images.length === 0 ? (
        <p className="muted small" style={{ padding: '12px 14px', fontStyle: 'italic' }}>
          No images uploaded.
        </p>
      ) : (
        <div className="img-panel-list">
          {images.map((image, index) => {
            const count = usageCounts[image.id] ?? 0;
            return (
              <div
                key={image.id}
                className="img-panel-item"
                draggable
                title={`Drag to insert • ${image.title}`}
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/blog-image', image.id);
                  e.dataTransfer.setData('text/plain', image.id);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
              >
                <div className="img-panel-thumb-wrap">
                  <img src={image.url} alt={image.title} className="img-panel-thumb" />
                  <span
                    className={`img-panel-badge ${count > 0 ? 'img-panel-badge--used' : 'img-panel-badge--unused'}`}
                    title={count > 0 ? `Used ${count}x in article` : 'Not yet used'}
                  >
                    {count > 0 ? `×${count}` : '–'}
                  </span>
                </div>
                <div className="img-panel-meta">
                  <p className="img-panel-name">{image.title}</p>
                  <p className={`img-panel-usage${count > 0 ? ' used' : ''}`}>
                    {count > 0 ? `Used ×${count}` : 'Unused'}
                  </p>
                </div>
                <button
                  type="button"
                  className="img-panel-settings"
                  onClick={() => onSettings(index)}
                  title="Image settings"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Block insert bar shown between/below blocks ───────────────────────────────
function InsertBar({ onInsert, onDropImage }) {
  const [dropping, setDrop] = useState(false);
  const handleDragOver = (e) => {
    if (!e.dataTransfer.types.includes('application/blog-image')) return;
    e.preventDefault();
    setDrop(true);
  };
  const handleDragLeave = () => setDrop(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setDrop(false);
    const id = e.dataTransfer.getData('application/blog-image');
    if (id && onDropImage) onDropImage(id);
  };
  return (
    <div
      className={`blog-insert-bar${dropping ? ' drop-active' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <button type="button" className="blog-insert-btn" onClick={() => onInsert('paragraph')} title="Insert text section">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Text
      </button>
      <button type="button" className="blog-insert-btn" onClick={() => onInsert('image')} title="Insert image">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        Image
      </button>
      <button type="button" className="blog-insert-btn" onClick={() => onInsert('image-grid')} title="Insert image grid">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
        Grid
      </button>
      {dropping && <span className="blog-insert-drop-hint">Drop image here</span>}
    </div>
  );
}

// ── Auto-arrange modal ────────────────────────────────────────────────────────
function AutoArrangeModal({ images, onArrange, onSkip }) {
  const [mode, setMode] = useState('individual'); // 'individual' | 'grid'
  const [cols, setCols] = useState(2);
  const [groupSize, setGroupSize] = useState(images.length);

  return (
    <div className="gm-backdrop" onClick={onSkip}>
      <div className="gm-modal" style={{ width: 'min(460px, 100%)' }} onClick={(e) => e.stopPropagation()}>
        <div className="gm-header">
          <h3 className="gm-title">Arrange images into sections?</h3>
          <button className="gm-close" type="button" onClick={onSkip} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="gm-body">
          <p className="muted small" style={{ margin: '0 0 16px' }}>
            {images.length} image{images.length !== 1 ? 's' : ''} uploaded. How would you like to add them to the article?
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label className="arrange-option" onClick={() => setMode('individual')}
              style={{ background: mode === 'individual' ? 'rgba(243,210,122,0.08)' : 'var(--card)', borderColor: mode === 'individual' ? 'var(--accent)' : 'var(--border)' }}>
              <input type="radio" name="mode" value="individual" checked={mode === 'individual'} onChange={() => setMode('individual')} style={{ display: 'none' }} />
              <div>
                <strong style={{ fontSize: 14 }}>One image per section</strong>
                <p className="muted small" style={{ margin: '2px 0 0' }}>Each image gets its own full-width image block.</p>
              </div>
            </label>
            <label className="arrange-option" onClick={() => setMode('grid')}
              style={{ background: mode === 'grid' ? 'rgba(243,210,122,0.08)' : 'var(--card)', borderColor: mode === 'grid' ? 'var(--accent)' : 'var(--border)' }}>
              <input type="radio" name="mode" value="grid" checked={mode === 'grid'} onChange={() => setMode('grid')} style={{ display: 'none' }} />
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: 14 }}>Grid layout</strong>
                <p className="muted small" style={{ margin: '2px 0 8px' }}>Group all images into a single grid section.</p>
                {mode === 'grid' && (
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <label className="gm-label" style={{ flexShrink: 0 }}>Columns</label>
                    <input type="number" min="1" max="6" value={cols}
                      onChange={(e) => setCols(Number(e.target.value))}
                      style={{ width: 64, padding: '6px 8px', fontSize: 13 }}
                      onClick={(e) => e.stopPropagation()} />
                  </div>
                )}
              </div>
            </label>
          </div>
        </div>
        <div className="gm-footer">
          <button className="pill" type="button" onClick={() => onArrange(mode, cols)}>
            Add to article
          </button>
          <button className="ghost" type="button" onClick={onSkip}>Skip</button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
const BlogEditorPage = () => {
  const navigate = useNavigate();
  const { postId } = useParams();
  const { profile, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [notice, setNotice] = useState('');
  const [noticeType, setNoticeType] = useState('info'); // 'info' | 'auto'
  const [dragActive, setDragActive] = useState(false);
  const [viewMode, setViewMode] = useState('visual');
  const [contentBlocks, setContentBlocks] = useState(() => parseContentBlocks(''));
  const [showPreview, setShowPreview] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const [autoArrangeImages, setAutoArrangeImages] = useState(null);
  const [imagePanelOpen, setImagePanelOpen] = useState(false);

  // Count how many times each image token appears in the current HTML content
  const usageCounts = useMemo(() => {
    const html = formData.contentHtml || '';
    const counts = {};
    for (const img of formData.images) {
      const id = img.id;
      let n = (html.match(new RegExp(`<image:${id}>`, 'gi')) || []).length;
      for (const gm of (html.match(/<image-grid:[^>]+>/gi) || [])) {
        const m = gm.match(/tokens=([^|>]+)/i);
        if (m) n += m[1].split(',').filter((t) => t.trim() === id).length;
      }
      counts[id] = n;
    }
    return counts;
  }, [formData.images, formData.contentHtml]);
  const lastEditorRef = useRef('visual');
  const htmlEditorRef = useRef(null);
  const autoSaveTimer = useRef(null);
  const currentPostIdRef = useRef(postId); // tracks the live post id (may differ before first save)
  const formDataRef = useRef(formData);

  const isEditing = Boolean(postId);

  // Keep ref in sync so auto-save closure can access latest formData
  useEffect(() => { formDataRef.current = formData; }, [formData]);
  useEffect(() => { currentPostIdRef.current = postId; }, [postId]);

  useEffect(() => {
    if (!authLoading && !profile?.is_admin) navigate('/');
  }, [profile, authLoading, navigate]);

  useEffect(() => {
    const loadPosts = async () => {
      const fetchedPosts = await getBlogPosts(true);
      setPosts(fetchedPosts);
      setLoading(false);
    };
    loadPosts();
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(''), noticeType === 'auto' ? 1800 : 2600);
    return () => clearTimeout(timer);
  }, [notice, noticeType]);

  useEffect(() => {
    if (!isEditing) {
      const initials = profile?.display_name
        ? profile.display_name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
        : '';
      setFormData({ ...emptyForm, authorName: profile?.display_name || '', authorInitials: initials });
      setContentBlocks(parseContentBlocks(''));
      setAutoSaveEnabled(false);
      return;
    }
    const target = posts.find((post) => post.id === postId);
    if (target) {
      setFormData({
        ...target,
        contentHtml: target.contentHtml ?? target.content ?? '',
        images: normalizeImages(target.images ?? []),
      });
      setContentBlocks(parseContentBlocks(target.contentHtml ?? target.content ?? ''));
      setAutoSaveEnabled(true);
    }
  }, [isEditing, postId, posts, profile]);

  // ── Auto-save logic ──────────────────────────────────────────────────────────
  const performAutoSave = useCallback(async () => {
    const data = formDataRef.current;
    const livePostId = currentPostIdRef.current;

    // For new posts, only auto-save once there's a title
    if (!livePostId && !data.title?.trim()) return;

    const dateValue = data.date || formatDate();
    const baseId = data.id || slugify(data.title) || `post-${Date.now()}`;

    try {
      if (livePostId) {
        // Existing post — update silently
        await updateBlogPost(livePostId, {
          ...data,
          date: dateValue,
          published: data.published === true,
        });
        setNoticeType('auto');
        setNotice('Auto-saved');
      } else {
        // New post — create draft and navigate to edit URL
        const existingIds = posts.map((p) => p.id);
        let finalId = baseId;
        let counter = 1;
        while (existingIds.includes(finalId)) { finalId = `${baseId}-${counter}`; counter++; }
        const newPost = { ...data, id: finalId, date: dateValue, published: false };
        await createBlogPost(newPost);
        setNoticeType('auto');
        setNotice('Draft saved');
        navigate(`/blog/${finalId}/edit`, { replace: true });
        const fetchedPosts = await getBlogPosts(true);
        setPosts(fetchedPosts);
      }
    } catch (_) {
      // Silent fail for auto-save
    }
  }, [navigate, posts]);

  // Debounce: schedule auto-save 3s after any content change
  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => { performAutoSave(); }, 3000);
  }, [performAutoSave]);

  // Enable auto-save for new posts once user starts typing a title
  useEffect(() => {
    if (!isEditing && formData.title?.trim()) setAutoSaveEnabled(true);
  }, [formData.title, isEditing]);

  // Trigger debounced auto-save on content changes
  useEffect(() => {
    if (!autoSaveEnabled) return;
    scheduleAutoSave();
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [formData, autoSaveEnabled, scheduleAutoSave]);

  const previewHtml = useMemo(
    () => renderBlogContent(formData.contentHtml, formData.images),
    [formData.contentHtml, formData.images],
  );

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const updateHtmlContent = (nextHtml) => {
    setFormData((prev) => ({ ...prev, contentHtml: nextHtml }));
  };

  const applyHtmlSnippet = (snippet) => {
    const textarea = htmlEditorRef.current;
    if (!textarea) return;
    const { selectionStart, selectionEnd, value } = textarea;
    const nextValue = `${value.slice(0, selectionStart)}${snippet}${value.slice(selectionEnd)}`;
    updateHtmlContent(nextValue);
    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = selectionStart + snippet.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const wrapHtmlSelection = (openTag, closeTag = openTag, placeholder = 'Your text') => {
    const textarea = htmlEditorRef.current;
    if (!textarea) return;
    const { selectionStart, selectionEnd, value } = textarea;
    const selected = value.slice(selectionStart, selectionEnd) || placeholder;
    const snippet = `${openTag}${selected}${closeTag}`;
    const nextValue = `${value.slice(0, selectionStart)}${snippet}${value.slice(selectionEnd)}`;
    updateHtmlContent(nextValue);
    requestAnimationFrame(() => {
      textarea.focus();
      const start = selectionStart + openTag.length;
      textarea.setSelectionRange(start, start + selected.length);
    });
  };

  const insertHtmlList = (type) => {
    const textarea = htmlEditorRef.current;
    if (!textarea) return;
    const { selectionStart, selectionEnd, value } = textarea;
    const selected = value.slice(selectionStart, selectionEnd).trim() || 'List item';
    const items = selected.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => `<li>${l}</li>`).join('');
    const snippet = `<${type}>${items}</${type}>`;
    updateHtmlContent(`${value.slice(0, selectionStart)}${snippet}${value.slice(selectionEnd)}`);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(selectionStart + snippet.length, selectionStart + snippet.length);
    });
  };

  const insertHtmlLink = () => {
    const url = window.prompt('Enter link URL');
    if (!url) return;
    wrapHtmlSelection(`<a href="${url}">`, '</a>', 'Link text');
  };

  const insertImageToken = () => {
    const token = window.prompt('Enter image token (image id or title)');
    if (!token) return;
    applyHtmlSnippet(`<image:${token}>`);
  };

  useEffect(() => {
    if (viewMode !== 'visual') return;
    if (lastEditorRef.current !== 'html') return;
    setContentBlocks(parseContentBlocks(formData.contentHtml));
    lastEditorRef.current = 'visual';
  }, [formData.contentHtml, viewMode]);

  const updateBlocks = (nextBlocks) => {
    lastEditorRef.current = 'visual';
    setContentBlocks(nextBlocks);
    setFormData((prev) => ({ ...prev, contentHtml: formatBlocksToContent(nextBlocks) }));
  };

  const newBlock = (type) =>
    type === 'image'
      ? { id: createBlockId(), type: 'image', token: '' }
      : type === 'image-grid'
        ? { id: createBlockId(), type: 'image-grid', columns: 2, rows: 2, tokens: [], caption: '', texts: [] }
        : { id: createBlockId(), type: 'paragraph', text: '' };

  const addBlock = (type) => updateBlocks([...contentBlocks, newBlock(type)]);

  const insertBlockAt = (index, type, presetToken = '') => {
    const next = [...contentBlocks];
    const block = newBlock(type);
    if (type === 'image' && presetToken) block.token = presetToken;
    next.splice(index, 0, block);
    updateBlocks(next);
  };

  const removeBlock = (index) => {
    const next = contentBlocks.filter((_, i) => i !== index);
    updateBlocks(next.length ? next : [{ id: createBlockId(), type: 'paragraph', text: '' }]);
  };

  const moveBlock = (fromIndex, direction) => {
    const targetIndex = fromIndex + direction;
    if (targetIndex < 0 || targetIndex >= contentBlocks.length) return;
    const next = [...contentBlocks];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(targetIndex, 0, moved);
    updateBlocks(next);
  };

  const handleBlockChange = (index, value) =>
    updateBlocks(contentBlocks.map((b, i) => i === index ? { ...b, text: value } : b));

  const handleBlockImageChange = (index, value) =>
    updateBlocks(contentBlocks.map((b, i) => i === index ? { ...b, token: value } : b));

  const handleBlockGridChange = (index, field, value) =>
    updateBlocks(contentBlocks.map((b, i) => i === index ? { ...b, [field]: value } : b));

  const updateGridToken = (blockIndex, slotIndex, nextToken) =>
    updateBlocks(contentBlocks.map((b, i) => {
      if (i !== blockIndex) return b;
      const tokens = [...(b.tokens ?? [])];
      tokens[slotIndex] = nextToken;
      return { ...b, tokens };
    }));

  const updateGridText = (blockIndex, slotIndex, nextText) =>
    updateBlocks(contentBlocks.map((b, i) => {
      if (i !== blockIndex) return b;
      const texts = [...(b.texts ?? [])];
      texts[slotIndex] = nextText;
      return { ...b, texts };
    }));

  // ── Image arrange ─────────────────────────────────────────────────────────
  const handleArrangeImages = (mode, cols, newImages) => {
    const imgs = newImages || autoArrangeImages;
    setAutoArrangeImages(null);
    if (!imgs?.length) return;

    let addedBlocks;
    if (mode === 'individual') {
      addedBlocks = imgs.map((img) => ({ id: createBlockId(), type: 'image', token: img.id }));
    } else {
      const rows = Math.ceil(imgs.length / cols);
      const tokens = imgs.map((img) => img.id);
      addedBlocks = [{ id: createBlockId(), type: 'image-grid', columns: cols, rows, tokens, caption: '', texts: [] }];
    }
    updateBlocks([...contentBlocks, ...addedBlocks]);
  };

  // ── File handling ─────────────────────────────────────────────────────────
  const handleFiles = (files) => {
    const uploads = Array.from(files ?? []);
    if (!uploads.length) return;

    Promise.all(
      uploads.map((file, index) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              id: `upload-${Date.now()}-${index}`,
              title: file.name.replace(/\.[^/.]+$/, ''),
              url: reader.result,
              price: 3,
              focusX: 50,
              focusY: 50,
              altText: file.name.replace(/\.[^/.]+$/, ''),
              caption: '',
              linkUrl: '',
              openInNewTab: false,
            });
          };
          reader.readAsDataURL(file);
        }),
      ),
    ).then((uploaded) => {
      setFormData((prev) => ({ ...prev, images: [...(prev.images ?? []), ...uploaded] }));
      // Show auto-arrange prompt
      setAutoArrangeImages(uploaded);
    });
  };

  const handleImageUpload = (event) => { handleFiles(event.target.files); event.target.value = ''; };
  const handleDrop = (event) => { event.preventDefault(); setDragActive(false); if (event.dataTransfer?.files?.length) handleFiles(event.dataTransfer.files); };
  const handleDragOver = (event) => { event.preventDefault(); setDragActive(true); };
  const handleDragLeave = () => setDragActive(false);

  const handleImageUpdate = (index, field) => (event) => {
    let value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    if (['price', 'focusX', 'focusY'].includes(field)) value = Number(value);
    setFormData((prev) => ({
      ...prev,
      images: prev.images.map((img, i) => i === index ? { ...img, [field]: value } : img),
    }));
  };

  const handleRemoveImage = (index) => {
    setFormData((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  const insertImageIntoContent = (image) => {
    const token = image.id || image.title;
    if (viewMode === 'html') {
      lastEditorRef.current = 'html';
      setFormData((prev) => ({
        ...prev,
        contentHtml: `${prev.contentHtml}${prev.contentHtml ? '\n' : ''}<image:${token}>`,
      }));
      return;
    }
    updateBlocks([...contentBlocks, { id: createBlockId(), type: 'image', token }]);
  };

  // ── Manual save / publish ─────────────────────────────────────────────────
  const buildPost = (overrides = {}) => {
    const data = { ...formData, ...overrides };
    const dateValue = data.date || formatDate();
    const baseId = data.id || slugify(data.title) || `post-${Date.now()}`;

    const existingIds = posts.map((p) => p.id);
    let finalId = baseId;
    let counter = 1;

    while (existingIds.includes(finalId) && finalId !== postId) {
      finalId = `${baseId}-${counter}`;
      counter++;
    }

    return {
      ...data,
      id: finalId,
      date: dateValue,
      published: data.published === true,
      publishDate: data.publishDate || '',
      scheduledAt: data.scheduledAt || null,
      lastEdited: formatFullDate(),
      images: data.images ?? [],
    };
  };

  const handleSave = async (event, overrides = {}) => {
    event?.preventDefault?.();

    const nextPost = buildPost({
      ...overrides,
      published: overrides.published ?? formData.published ?? false,
    });

    if (!nextPost.title || !nextPost.excerpt) {
      setNotice('Add a title and excerpt before saving.');
      return;
    }

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

    setSaving(true);

    try {
      let saved;
      if (isEditing) {
        saved = await updateBlogPost(postId, nextPost);
        setNotice(nextPost.published ? 'Published post saved.' : 'Draft saved.');
      } else {
        saved = await createBlogPost(nextPost);
        setNotice(nextPost.published ? 'Post published!' : 'Draft created.');
        navigate(`/blog/${nextPost.id}/edit`);
      }

      // Use returned images (real storage URLs replace any base64 DataURLs)
      const savedPost = { ...nextPost, images: saved?.images ?? nextPost.images };
      setFormData(savedPost);
      formDataRef.current = savedPost;

      const fetchedPosts = await getBlogPosts(true);
      setPosts(fetchedPosts);
    } catch (err) {
      setNotice(`Error: ${err?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditing) { navigate('/blog'); return; }
    try {
      await deleteBlogPost(postId);
      navigate('/blog');
    } catch {
      setNotice('Error deleting post.');
    }
  };

  const handlePublish = async () => {
    if (!formData.title || !formData.excerpt) {
      setNotice('Add a title and excerpt before publishing.');
      return;
    }

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

    setSaving(true);

    const nextPost = buildPost({
      published: true,
      publishDate: formData.publishDate || formatDate(),
      lastEdited: formatFullDate(),
    });

    try {
      let saved;
      if (isEditing) {
        saved = await updateBlogPost(postId, nextPost);
      } else {
        saved = await createBlogPost(nextPost);
        navigate(`/blog/${nextPost.id}/edit`);
      }

      const savedPost = { ...nextPost, images: saved?.images ?? nextPost.images };
      setFormData(savedPost);
      formDataRef.current = savedPost;

      const isScheduled = nextPost.scheduledAt && new Date(nextPost.scheduledAt) > new Date();
      setNotice(isScheduled ? `Scheduled for ${new Date(nextPost.scheduledAt).toLocaleString()}` : 'Post published!');

      const fetchedPosts = await getBlogPosts(true);
      setPosts(fetchedPosts);
    } catch (err) {
      setNotice(`Error: ${err?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="site-wrap">
      <header className="site-nav">
        <div className="site-nav-inner">
          <Link to="/" className="site-logo">Caleb Wolf</Link>
          <div className="site-nav-actions" style={{ marginLeft: 'auto' }}>
            <Link to="/blog/admin" className="site-admin-btn">← Blog Admin</Link>
          </div>
        </div>
      </header>

      <div className="adm-layout">
        <aside className="adm-sidebar">
          <div className="adm-sidebar-header">
            <div>
              <p className="adm-sidebar-eyebrow">Blog</p>
              <h2 className="adm-sidebar-title">{isEditing ? 'Edit Post' : 'New Post'}</h2>
            </div>
          </div>
          <nav className="adm-nav">
            <button type="button" className={`adm-nav-item${viewMode === 'visual' ? ' active' : ''}`} onClick={() => setViewMode('visual')}>
              <span className="adm-nav-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
                </svg>
              </span>
              <span className="adm-nav-label">Visual Editor</span>
            </button>
            <button type="button" className={`adm-nav-item${viewMode === 'html' ? ' active' : ''}`} onClick={() => { lastEditorRef.current = 'html'; setViewMode('html'); }}>
              <span className="adm-nav-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
                </svg>
              </span>
              <span className="adm-nav-label">HTML Editor</span>
            </button>
            <button type="button" className={`adm-nav-item${showPreview ? ' active' : ''}`} onClick={() => { setViewMode('visual'); setShowPreview((p) => !p); }}>
              <span className="adm-nav-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                </svg>
              </span>
              <span className="adm-nav-label">{showPreview ? 'Hide Preview' : 'Preview'}</span>
            </button>
            <button type="button" className="adm-nav-item" onClick={() => setIsComposeOpen(true)}>
              <span className="adm-nav-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </span>
              <span className="adm-nav-label">Compose</span>
            </button>
          </nav>
          <div className="adm-sidebar-footer">
            <button type="button" className="adm-sidebar-link" onClick={handleSave} disabled={saving || !profile?.is_admin} style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
              </svg>
              {saving ? 'Saving…' : 'Save Draft'}
            </button>
            <button type="button" className="adm-sidebar-link" onClick={handleDelete} disabled={saving} style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', color: 'var(--muted)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>
              </svg>
              {isEditing ? 'Delete Post' : 'Discard Draft'}
            </button>
          </div>
        </aside>

        <div className="adm-main">
          <header className="adm-topbar">
            <div className="adm-topbar-breadcrumb">
              <span className="adm-topbar-section">Blog</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              <span className="adm-topbar-current">{isEditing ? 'Edit Post' : 'New Post'}</span>
            </div>
            <div className="adm-topbar-right">
              {notice && (
                <span className={`notice${noticeType === 'auto' ? ' notice-auto' : ''}`} style={{ fontSize: 13 }}>
                  {noticeType === 'auto' && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ marginRight: 4 }}>
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  )}
                  {notice}
                </span>
              )}
              <button className="ghost" type="button" onClick={handleSave} disabled={saving || !profile?.is_admin}>
                {saving ? 'Saving…' : 'Save Draft'}
              </button>
              <button className="btn" type="button" onClick={handlePublish} disabled={saving || !profile?.is_admin}>
                {saving ? 'Publishing…' : 'Publish'}
              </button>
              <div className="adm-avatar">{profile?.display_name?.[0]?.toUpperCase() || 'A'}</div>
            </div>
          </header>

          <div className="adm-content">
            <section className="blog-editor-shell" style={{ padding: 0, border: 'none', background: 'none' }}>
              <div className={`blog-editor-body${showPreview ? ' with-preview' : ''}`}>
                <main className="blog-editor-canvas">
                  <div className="blog-editor-header">
                    <input
                      className="blog-editor-title"
                      placeholder="Write your headline..."
                      value={formData.title}
                      onChange={handleChange('title')}
                    />
                    <div className="blog-editor-meta">
                      <span className="blog-editor-author">{formData.authorInitials || profile?.display_name?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?'}</span>
                      <span className="muted small">{formData.authorName || profile?.display_name || ''}</span>
                      <span className="muted small">·</span>
                      <span className="muted small">{formData.publishDate || formatDate()}</span>
                      <span className="muted small">·</span>
                      <span className="muted small">{deriveReadTime(formData.contentHtml, formData.readTime)} min read</span>
                      {formData.lastEdited && (
                        <span className="blog-editor-edited" title={`Last edited: ${formData.lastEdited}`}>Last edited</span>
                      )}
                      {autoSaveEnabled && (
                        <span className="muted small" style={{ fontSize: 11, opacity: 0.5 }}>auto-save on</span>
                      )}
                    </div>
                  </div>

                  {/* Top toolbar — switch editor mode + toggle image panel */}
                  <div className="blog-editor-toolbar">
                    <button type="button" onClick={() => setIsComposeOpen(true)}>Compose</button>
                    <button type="button" onClick={() => setViewMode('visual')} className={viewMode === 'visual' ? 'active' : ''}>Visual</button>
                    <button type="button" onClick={() => { lastEditorRef.current = 'html'; setViewMode('html'); }} className={viewMode === 'html' ? 'active' : ''}>HTML</button>
                    <button type="button" onClick={() => setShowPreview(!showPreview)} className={showPreview ? 'active' : ''}>Preview</button>
                    <button
                      type="button"
                      className={`blog-images-toggle${imagePanelOpen ? ' active' : ''}`}
                      onClick={() => setImagePanelOpen(!imagePanelOpen)}
                      title="Toggle image panel"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                      </svg>
                      Images
                      {formData.images.length > 0 && <span className="blog-images-count">{formData.images.length}</span>}
                    </button>
                  </div>

                  {/* Collapsible image panel — sits inline below the toolbar */}
                  {imagePanelOpen && (
                    <div className="blog-image-panel-inline">
                      <ImagePanel
                        images={formData.images}
                        usageCounts={usageCounts}
                        onSettings={setActiveImageIndex}
                      />
                    </div>
                  )}

                  {viewMode === 'html' ? (
                    <div className="blog-html-editor">
                      <div className="blog-html-toolbar">
                        <button type="button" onClick={() => wrapHtmlSelection('<p>', '</p>')}>Paragraph</button>
                        <button type="button" onClick={() => wrapHtmlSelection('<h2>', '</h2>', 'Heading')}>H2</button>
                        <button type="button" onClick={() => wrapHtmlSelection('<h3>', '</h3>', 'Heading')}>H3</button>
                        <button type="button" onClick={() => wrapHtmlSelection('<strong>', '</strong>')}>Bold</button>
                        <button type="button" onClick={() => wrapHtmlSelection('<em>', '</em>')}>Italic</button>
                        <button type="button" onClick={() => wrapHtmlSelection('<u>', '</u>')}>Underline</button>
                        <button type="button" onClick={() => insertHtmlList('ul')}>Bullet list</button>
                        <button type="button" onClick={() => insertHtmlList('ol')}>Numbered list</button>
                        <button type="button" onClick={insertHtmlLink}>Link</button>
                        <button type="button" onClick={() => wrapHtmlSelection('<blockquote>', '</blockquote>')}>Quote</button>
                        <button type="button" onClick={insertImageToken}>Image token</button>
                      </div>
                      <textarea
                        ref={htmlEditorRef}
                        rows="14"
                        value={formData.contentHtml}
                        onChange={(event) => { lastEditorRef.current = 'html'; handleChange('contentHtml')(event); }}
                        placeholder="Write your story here. Use <image:Photo title> to place a photo."
                        onDragOver={(e) => {
                          if (e.dataTransfer.types.includes('application/blog-image')) e.preventDefault();
                        }}
                        onDrop={(e) => {
                          const imageId = e.dataTransfer.getData('application/blog-image');
                          if (!imageId) return;
                          e.preventDefault();
                          const ta = htmlEditorRef.current;
                          if (!ta) return;
                          const pos = ta.selectionStart ?? ta.value.length;
                          const token = `<image:${imageId}>`;
                          const next = ta.value.slice(0, pos) + token + ta.value.slice(pos);
                          lastEditorRef.current = 'html';
                          handleChange('contentHtml')({ target: { value: next } });
                          requestAnimationFrame(() => {
                            ta.focus();
                            ta.setSelectionRange(pos + token.length, pos + token.length);
                          });
                        }}
                      />
                    </div>
                  ) : (
                    <div className="blog-visual-editor">
                      {contentBlocks.map((block, index) => (
                        <div key={block.id}>
                          {/* Block */}
                          {block.type === 'image' ? (
                            <div className="blog-visual-block">
                              <div className="blog-visual-block-head">
                                <span className="muted small">Image section</span>
                                <div className="blog-visual-block-actions">
                                  <button type="button" onClick={() => moveBlock(index, -1)} title="Move up">↑</button>
                                  <button type="button" onClick={() => moveBlock(index, 1)} title="Move down">↓</button>
                                  <button type="button" className="ghost" onClick={() => removeBlock(index)}>Remove</button>
                                </div>
                              </div>
                              <div className="blog-visual-image">
                                <select value={block.token} onChange={(e) => handleBlockImageChange(index, e.target.value)}>
                                  <option value="">Select an image</option>
                                  {formData.images.map((img) => <option key={img.id} value={img.id}>{img.title}</option>)}
                                </select>
                                {(() => {
                                  const selected = findImageByToken(formData.images, block.token);
                                  const selectedIndex = selected ? formData.images.findIndex((img) => img.id === selected.id) : -1;
                                  if (!selected) return <p className="muted small">Choose an uploaded image to preview it.</p>;
                                  return (
                                    <>
                                      <img src={selected.url} alt={selected.altText || selected.title} style={{ '--frame-position': `${selected.focusX ?? 50}% ${selected.focusY ?? 50}%` }} />
                                      <div className="blog-visual-image-settings">
                                        <label>Alt text<input value={selected.altText ?? ''} onChange={handleImageUpdate(selectedIndex, 'altText')} placeholder="Describe the image" /></label>
                                        <label>Caption<input value={selected.caption ?? ''} onChange={handleImageUpdate(selectedIndex, 'caption')} placeholder="Optional caption" /></label>
                                        <label>Link URL<input value={selected.linkUrl ?? ''} onChange={handleImageUpdate(selectedIndex, 'linkUrl')} placeholder="https://" /></label>
                                        <label className="blog-inline-toggle">
                                          <input type="checkbox" checked={selected.openInNewTab ?? false} onChange={handleImageUpdate(selectedIndex, 'openInNewTab')} />
                                          Open link in new tab
                                        </label>
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          ) : block.type === 'image-grid' ? (
                            <div className="blog-visual-block">
                              <div className="blog-visual-block-head">
                                <span className="muted small">Image grid</span>
                                <div className="blog-visual-block-actions">
                                  <button type="button" onClick={() => moveBlock(index, -1)}>↑</button>
                                  <button type="button" onClick={() => moveBlock(index, 1)}>↓</button>
                                  <button type="button" className="ghost" onClick={() => removeBlock(index)}>Remove</button>
                                </div>
                              </div>
                              <div className="blog-grid-settings">
                                <label>Columns<input type="number" min="1" max="6" value={block.columns ?? 2} onChange={(e) => handleBlockGridChange(index, 'columns', Number(e.target.value))} /></label>
                                <label>Rows<input type="number" min="1" max="6" value={block.rows ?? 2} onChange={(e) => handleBlockGridChange(index, 'rows', Number(e.target.value))} /></label>
                                <label className="blog-grid-caption">Grid text<textarea rows="2" value={block.caption ?? ''} onChange={(e) => handleBlockGridChange(index, 'caption', e.target.value)} placeholder="Optional caption" /></label>
                              </div>
                              <div className="blog-grid-picker" style={{ '--grid-columns': block.columns ?? 2 }}>
                                {Array.from({ length: Math.max(1, (block.columns ?? 1) * (block.rows ?? 1)) }).map((_, slotIndex) => (
                                  <div key={`${block.id}-slot-${slotIndex}`} className="blog-grid-slot">
                                    <label>Slot {slotIndex + 1}
                                      <select value={(block.tokens ?? [])[slotIndex] ?? ''} onChange={(e) => updateGridToken(index, slotIndex, e.target.value)}>
                                        <option value="">Select an image</option>
                                        {formData.images.map((img) => <option key={img.id} value={img.id}>{img.title}</option>)}
                                      </select>
                                    </label>
                                    <label>Slot text<textarea rows="3" value={(block.texts ?? [])[slotIndex] ?? ''} onChange={(e) => updateGridText(index, slotIndex, e.target.value)} placeholder="Add text beside this image" /></label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="blog-visual-block">
                              <div className="blog-visual-block-head">
                                <span className="muted small">Text section</span>
                                <div className="blog-visual-block-actions">
                                  <button type="button" onClick={() => moveBlock(index, -1)}>↑</button>
                                  <button type="button" onClick={() => moveBlock(index, 1)}>↓</button>
                                  <button type="button" className="ghost" onClick={() => removeBlock(index)}>Remove</button>
                                </div>
                              </div>
                              <textarea rows="4" value={block.text} onChange={(e) => handleBlockChange(index, e.target.value)} placeholder="Write your paragraph..." />
                            </div>
                          )}
                          {/* Insert bar below every block — also a drop zone */}
                          <InsertBar
                            onInsert={(type) => insertBlockAt(index + 1, type)}
                            onDropImage={(imageId) => insertBlockAt(index + 1, 'image', imageId)}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="blog-editor-actions">
                    <button className="btn" type="button" onClick={handleSave} disabled={saving}>
                      {saving ? 'Saving…' : 'Save as Draft'}
                    </button>
                    <button className="ghost" type="button" onClick={handleDelete} disabled={saving}>
                      {isEditing ? 'Delete post' : 'Discard draft'}
                    </button>
                  </div>

                  {formData.images.length > 0 && (
                    <div className="blog-image-editor">
                      <h3>Image pricing</h3>
                      <div className="blog-image-grid">
                        {formData.images.map((image, index) => (
                          <div key={image.id} className="blog-image-card">
                            <img src={image.url} alt={image.title} style={{ '--frame-position': `${image.focusX ?? 50}% ${image.focusY ?? 50}%` }} />
                            <div className="blog-image-card-meta">
                              <div>
                                <p className="blog-image-title">{image.title}</p>
                                <p className="muted small">{image.price} credits</p>
                              </div>
                              <button className="ghost" type="button" onClick={() => setActiveImageIndex(index)}>Settings</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </main>

                {showPreview && (
                  <aside className="blog-editor-preview">
                    <p className="muted small">Live preview</p>
                    <div className="blog-body" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                  </aside>
                )}
              </div>

              {/* ── Compose modal ── */}
              {isComposeOpen && (
                <div className="blog-modal-backdrop" role="dialog" aria-modal="true">
                  <div className="blog-modal">
                    <div className="blog-modal-header">
                      <div>
                        <p className="eyebrow">Compose</p>
                        <p className="muted small">Add sections &amp; details</p>
                      </div>
                      <button className="ghost" type="button" onClick={() => setIsComposeOpen(false)}>Close</button>
                    </div>
                    <div className="blog-modal-body">
                      <div className="blog-sidebar-group">
                        <h4>Sections</h4>
                        <button type="button" className="ghost" onClick={() => { addBlock('paragraph'); setIsComposeOpen(false); }}>Add paragraph</button>
                        <button type="button" className="ghost" onClick={() => { addBlock('image'); setIsComposeOpen(false); }}>Add image block</button>
                        <button type="button" className="ghost" onClick={() => { addBlock('image-grid'); setIsComposeOpen(false); }}>Add image grid</button>
                      </div>
                      <div className="blog-sidebar-group">
                        <h4>Post details</h4>
                        <label>Author initials<input value={formData.authorInitials} onChange={handleChange('authorInitials')} /></label>
                        <label>Author name<input value={formData.authorName} onChange={handleChange('authorName')} /></label>
                        <label>Publish date<input value={formData.publishDate} onChange={handleChange('publishDate')} /></label>
                        <label>Read time (min)<input type="number" min="1" value={formData.readTime} onChange={handleChange('readTime')} /></label>
                        <label>Tag<input value={formData.tag} onChange={handleChange('tag')} /></label>
                        <label>Excerpt<textarea rows="3" value={formData.excerpt} onChange={handleChange('excerpt')} /></label>
                      </div>
                      <div className="blog-sidebar-group">
                        <h4>Release date</h4>
                        <p className="muted small" style={{ margin: '0 0 10px' }}>
                          Set a future date to schedule this post. Leave blank to publish immediately when you click Publish.
                        </p>
                        <label>
                          Release date &amp; time
                          <input
                            type="datetime-local"
                            value={formData.scheduledAt ? formData.scheduledAt.slice(0, 16) : ''}
                            onChange={(e) => setFormData((prev) => ({ ...prev, scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
                          />
                        </label>
                        {formData.scheduledAt && new Date(formData.scheduledAt) > new Date() && (
                          <p className="scheduled-badge">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            Scheduled: {new Date(formData.scheduledAt).toLocaleString()}
                          </p>
                        )}
                        {formData.scheduledAt && (
                          <button
                            type="button"
                            className="ghost"
                            style={{ marginTop: 6, fontSize: 12 }}
                            onClick={() => setFormData((prev) => ({ ...prev, scheduledAt: '' }))}
                          >
                            Clear release date
                          </button>
                        )}
                      </div>
                      <div className="blog-sidebar-group">
                        <h4>Images</h4>
                        <div className={`blog-upload${dragActive ? ' active' : ''}`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
                          <p className="muted small">Drag &amp; drop or click to upload</p>
                          <input type="file" accept="image/*" multiple onChange={handleImageUpload} />
                        </div>
                        {formData.images.length > 0 && (
                          <p className="muted small" style={{ marginTop: 6 }}>
                            {formData.images.length} image{formData.images.length !== 1 ? 's' : ''} attached
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Image settings modal ── */}
              {activeImageIndex !== null && formData.images[activeImageIndex] && (
                <div className="blog-modal-backdrop" role="dialog" aria-modal="true">
                  <div className="blog-modal">
                    <div className="blog-modal-header">
                      <div>
                        <p className="eyebrow">Image settings</p>
                        <p className="muted small">{formData.images[activeImageIndex].title}</p>
                      </div>
                      <button className="ghost" type="button" onClick={() => setActiveImageIndex(null)}>Close</button>
                    </div>
                    <div className="blog-modal-body">
                      <label>Title<input value={formData.images[activeImageIndex].title} onChange={handleImageUpdate(activeImageIndex, 'title')} /></label>
                      <label>Alt text<input value={formData.images[activeImageIndex].altText} onChange={handleImageUpdate(activeImageIndex, 'altText')} /></label>
                      <label>Caption<input value={formData.images[activeImageIndex].caption} onChange={handleImageUpdate(activeImageIndex, 'caption')} /></label>
                      <label>Link URL<input value={formData.images[activeImageIndex].linkUrl} onChange={handleImageUpdate(activeImageIndex, 'linkUrl')} /></label>
                      <label className="blog-inline-toggle">
                        <input type="checkbox" checked={formData.images[activeImageIndex].openInNewTab ?? false} onChange={handleImageUpdate(activeImageIndex, 'openInNewTab')} />
                        Open link in new tab
                      </label>
                      <label>Price (credits)<input type="number" min="1" value={formData.images[activeImageIndex].price} onChange={handleImageUpdate(activeImageIndex, 'price')} /></label>
                      <label>Frame X<input type="range" min="0" max="100" value={formData.images[activeImageIndex].focusX ?? 50} onChange={handleImageUpdate(activeImageIndex, 'focusX')} /></label>
                      <label>Frame Y<input type="range" min="0" max="100" value={formData.images[activeImageIndex].focusY ?? 50} onChange={handleImageUpdate(activeImageIndex, 'focusY')} /></label>
                      <div className="blog-modal-actions">
                        <button className="pill" type="button" onClick={() => { insertImageIntoContent(formData.images[activeImageIndex]); setActiveImageIndex(null); }}>Insert into article</button>
                        <button className="ghost" type="button" onClick={() => { handleRemoveImage(activeImageIndex); setActiveImageIndex(null); }}>Remove</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Auto-arrange prompt ── */}
              {autoArrangeImages && (
                <AutoArrangeModal
                  images={autoArrangeImages}
                  onArrange={(mode, cols) => handleArrangeImages(mode, cols)}
                  onSkip={() => setAutoArrangeImages(null)}
                />
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogEditorPage;
