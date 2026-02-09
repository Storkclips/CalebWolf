import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { formatDate, getBlogPosts, getBlogPost, createBlogPost, updateBlogPost, deleteBlogPost, renderBlogContent, slugify } from '../utils/blog';

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
  images: [],
};

const createBlockId = () => `block-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const parseContentBlocks = (value) => {
  if (!value) {
    return [{ id: createBlockId(), type: 'paragraph', text: '' }];
  }

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
      let tokensPart = '';
      let textPart = '';
      let captionPart = '';
      segments.forEach((segment) => {
        if (!segment) return;
        if (segment.startsWith('tokens=')) {
          tokensPart = segment.replace('tokens=', '');
          return;
        }
        if (segment.startsWith('text=')) {
          textPart = segment.replace('text=', '');
          return;
        }
        if (segment.startsWith('caption=')) {
          captionPart = segment.replace('caption=', '');
          return;
        }
        if (!tokensPart) {
          tokensPart = segment;
          return;
        }
        captionPart = captionPart ? `${captionPart}|${segment}` : segment;
      });
      const tokens = tokensPart
        .split(',')
        .map((token) => token.trim())
        .filter(Boolean);
      const texts = textPart
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => decodeURIComponent(entry));
      const caption = decodeURIComponent(captionPart || '').trim();
      blocks.push({
        id: createBlockId(),
        type: 'image-grid',
        columns,
        rows,
        tokens,
        caption,
        texts,
      });
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
      if (block.type === 'image') {
        return block.token ? `<image:${block.token}>` : '';
      }
      if (block.type === 'image-grid') {
        const layout = `${block.columns}x${block.rows}`;
        const tokens = (block.tokens ?? []).filter(Boolean).join(', ');
        const texts = (block.texts ?? [])
          .filter((entry) => entry && entry.trim())
          .map((entry) => encodeURIComponent(entry))
          .join(', ');
        const caption = block.caption ? `|caption=${encodeURIComponent(block.caption)}` : '';
        const tokensSegment = tokens ? `|tokens=${tokens}` : '';
        const textSegment = texts ? `|text=${texts}` : '';
        return `<image-grid:${layout}${tokensSegment}${textSegment}${caption}>`;
      }
      return block.text ?? '';
    })
    .filter((value) => value.trim() !== '')
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
  new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

const deriveReadTime = (content, fallback) => {
  if (fallback) return fallback;
  const wordCount = (content ?? '')
    .replace(/<image:[^>]+>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
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

const BlogEditorPage = () => {
  const navigate = useNavigate();
  const { postId } = useParams();
  const [posts, setPosts] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [notice, setNotice] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [viewMode, setViewMode] = useState('visual');
  const [contentBlocks, setContentBlocks] = useState(() => parseContentBlocks(''));
  const [showPreview, setShowPreview] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const lastEditorRef = useRef('visual');
  const htmlEditorRef = useRef(null);

  const isEditing = Boolean(postId);

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
    const timer = setTimeout(() => setNotice(''), 2600);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!isEditing) {
      setFormData(emptyForm);
      setContentBlocks(parseContentBlocks(''));
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
    }
  }, [isEditing, postId, posts]);

  const previewHtml = useMemo(
    () => renderBlogContent(formData.contentHtml, formData.images),
    [formData.contentHtml, formData.images],
  );

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const updateHtmlContent = (nextHtml) => {
    setFormData((prev) => ({
      ...prev,
      contentHtml: nextHtml,
    }));
  };

  const applyHtmlSnippet = (snippet, cursorOffset = null) => {
    const textarea = htmlEditorRef.current;
    if (!textarea) return;
    const { selectionStart, selectionEnd, value } = textarea;
    const before = value.slice(0, selectionStart);
    const after = value.slice(selectionEnd);
    const nextValue = `${before}${snippet}${after}`;
    updateHtmlContent(nextValue);
    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = cursorOffset ?? selectionStart + snippet.length;
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
      const end = start + selected.length;
      textarea.setSelectionRange(start, end);
    });
  };

  const insertHtmlList = (type) => {
    const textarea = htmlEditorRef.current;
    if (!textarea) return;
    const { selectionStart, selectionEnd, value } = textarea;
    const selected = value.slice(selectionStart, selectionEnd).trim() || 'List item';
    const items = selected
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => `<li>${line}</li>`)
      .join('');
    const snippet = `<${type}>${items}</${type}>`;
    const nextValue = `${value.slice(0, selectionStart)}${snippet}${value.slice(selectionEnd)}`;
    updateHtmlContent(nextValue);
    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = selectionStart + snippet.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const insertHtmlLink = () => {
    const url = window.prompt('Enter link URL');
    if (!url) return;
    wrapHtmlSelection(`<a href="${url}">`, '</a>', 'Link text');
  };

  const insertImageToken = () => {
    const textarea = htmlEditorRef.current;
    if (!textarea) return;
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
    setFormData((prev) => ({
      ...prev,
      contentHtml: formatBlocksToContent(nextBlocks),
    }));
  };

  const handleBlockChange = (index, value) => {
    const nextBlocks = contentBlocks.map((block, blockIndex) =>
      blockIndex === index ? { ...block, text: value } : block,
    );
    updateBlocks(nextBlocks);
  };

  const handleBlockImageChange = (index, value) => {
    const nextBlocks = contentBlocks.map((block, blockIndex) =>
      blockIndex === index ? { ...block, token: value } : block,
    );
    updateBlocks(nextBlocks);
  };

  const handleBlockGridChange = (index, field, value) => {
    const nextBlocks = contentBlocks.map((block, blockIndex) =>
      blockIndex === index ? { ...block, [field]: value } : block,
    );
    updateBlocks(nextBlocks);
  };

  const addBlock = (type) => {
    const nextBlock =
      type === 'image'
        ? { id: createBlockId(), type: 'image', token: '' }
        : type === 'image-grid'
          ? {
              id: createBlockId(),
              type: 'image-grid',
              columns: 2,
              rows: 2,
              tokens: [],
              caption: '',
              texts: [],
            }
        : { id: createBlockId(), type: 'paragraph', text: '' };
    updateBlocks([...contentBlocks, nextBlock]);
  };

  const removeBlock = (index) => {
    const nextBlocks = contentBlocks.filter((_, blockIndex) => blockIndex !== index);
    updateBlocks(nextBlocks.length ? nextBlocks : [{ id: createBlockId(), type: 'paragraph', text: '' }]);
  };

  const moveBlock = (fromIndex, direction) => {
    const targetIndex = fromIndex + direction;
    if (targetIndex < 0 || targetIndex >= contentBlocks.length) return;
    const nextBlocks = [...contentBlocks];
    const [moved] = nextBlocks.splice(fromIndex, 1);
    nextBlocks.splice(targetIndex, 0, moved);
    updateBlocks(nextBlocks);
  };

  const insertBlockAt = (index, type) => {
    const nextBlock =
      type === 'image'
        ? { id: createBlockId(), type: 'image', token: '' }
        : type === 'image-grid'
          ? {
              id: createBlockId(),
              type: 'image-grid',
              columns: 2,
              rows: 2,
              tokens: [],
              caption: '',
              texts: [],
            }
        : { id: createBlockId(), type: 'paragraph', text: '' };
    const nextBlocks = [...contentBlocks];
    nextBlocks.splice(index, 0, nextBlock);
    updateBlocks(nextBlocks);
  };

  const insertImageIntoContent = (image) => {
    const token = image.id || image.title;
    const html = `<image:${token}>`;
    if (viewMode === 'html') {
      lastEditorRef.current = 'html';
      setFormData((prev) => ({
        ...prev,
        contentHtml: `${prev.contentHtml}${prev.contentHtml ? '\n' : ''}${html}`,
      }));
      return;
    }
    const nextBlocks = [
      ...contentBlocks,
      { id: createBlockId(), type: 'image', token },
    ];
    updateBlocks(nextBlocks);
  };

  const updateGridToken = (blockIndex, slotIndex, nextToken) => {
    const nextBlocks = contentBlocks.map((block, index) => {
      if (index !== blockIndex) return block;
      const tokens = [...(block.tokens ?? [])];
      tokens[slotIndex] = nextToken;
      return { ...block, tokens };
    });
    updateBlocks(nextBlocks);
  };

  const updateGridText = (blockIndex, slotIndex, nextText) => {
    const nextBlocks = contentBlocks.map((block, index) => {
      if (index !== blockIndex) return block;
      const texts = [...(block.texts ?? [])];
      texts[slotIndex] = nextText;
      return { ...block, texts };
    });
    updateBlocks(nextBlocks);
  };

  const handleFiles = (files) => {
    const uploads = Array.from(files ?? []);
    if (!uploads.length) return;

    Promise.all(
      uploads.map(
        (file, index) =>
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
      setFormData((prev) => ({
        ...prev,
        images: [...(prev.images ?? []), ...uploaded],
      }));
    });
  };

  const handleImageUpload = (event) => {
    handleFiles(event.target.files);
    event.target.value = '';
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);
    if (event.dataTransfer?.files?.length) {
      handleFiles(event.dataTransfer.files);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleImageUpdate = (index, field) => (event) => {
    let value = event.target.value;
    if (event.target.type === 'checkbox') {
      value = event.target.checked;
    }
    if (['price', 'focusX', 'focusY'].includes(field)) {
      value = Number(value);
    }
    setFormData((prev) => ({
      ...prev,
      images: prev.images.map((image, imageIndex) =>
        imageIndex === index ? { ...image, [field]: value } : image,
      ),
    }));
  };

  const handleRemoveImage = (index) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, imageIndex) => imageIndex !== index),
    }));
  };

  const handleSave = async (event, overrides = {}) => {
    event?.preventDefault?.();
    const nextData = { ...formData, ...overrides };

    if (!nextData.title || !nextData.excerpt) {
      setNotice('Add a title and excerpt before saving.');
      return;
    }

    const dateValue = nextData.date || formatDate();
    const baseId = nextData.id || slugify(nextData.title) || `post-${Date.now()}`;
    const existingIds = posts.map((post) => post.id);
    let finalId = baseId;
    let counter = 1;

    while (existingIds.includes(finalId) && finalId !== postId) {
      finalId = `${baseId}-${counter}`;
      counter += 1;
    }

    const nextPost = {
      ...nextData,
      contentHtml: nextData.contentHtml,
      id: finalId,
      date: dateValue,
      lastEdited: isEditing ? formatFullDate() : nextData.lastEdited,
      images: nextData.images ?? [],
      published: nextData.published ?? false,
    };

    setSaving(true);
    try {
      if (isEditing) {
        await updateBlogPost(postId, nextPost);
        setNotice('Draft saved successfully.');
      } else {
        await createBlogPost(nextPost);
        setNotice('Draft created successfully.');
        navigate(`/blog/${nextPost.id}/edit`);
      }

      const fetchedPosts = await getBlogPosts(true);
      setPosts(fetchedPosts);
    } catch (error) {
      setNotice('Error saving draft. Please try again.');
      console.error('Error saving blog post:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditing) {
      navigate('/blog');
      return;
    }

    try {
      await deleteBlogPost(postId);
      navigate('/blog');
    } catch (error) {
      setNotice('Error deleting blog post. Please try again.');
      console.error('Error deleting blog post:', error);
    }
  };

  const handlePublish = async () => {
    if (!formData.title || !formData.excerpt) {
      setNotice('Add a title and excerpt before publishing.');
      return;
    }

    setSaving(true);
    const publishDate = formData.publishDate || formatDate();
    const dateValue = formData.date || formatDate();
    const baseId = formData.id || slugify(formData.title) || `post-${Date.now()}`;
    const existingIds = posts.map((post) => post.id);
    let finalId = baseId;
    let counter = 1;

    while (existingIds.includes(finalId) && finalId !== postId) {
      finalId = `${baseId}-${counter}`;
      counter += 1;
    }

    const nextPost = {
      ...formData,
      contentHtml: formData.contentHtml,
      id: finalId,
      date: dateValue,
      publishDate,
      lastEdited: formatFullDate(),
      images: formData.images ?? [],
      published: true,
    };

    try {
      if (isEditing) {
        await updateBlogPost(postId, nextPost);
        setNotice('Post published successfully!');
      } else {
        await createBlogPost(nextPost);
        setNotice('Post published successfully!');
        navigate(`/blog/${nextPost.id}/edit`);
      }

      const fetchedPosts = await getBlogPosts(true);
      setPosts(fetchedPosts);
    } catch (error) {
      setNotice('Error publishing post. Please try again.');
      console.error('Error publishing blog post:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <section className="blog-editor-shell">
        <header className="blog-editor-topbar">
          <div className="blog-editor-topbar-left">
            <Link className="ghost" to="/blog">
              ← Back
            </Link>
            <span className="muted small">{isEditing ? 'Editing post' : 'New draft'}</span>
          </div>
          <div className="blog-editor-topbar-actions">
            <button className="ghost" type="button" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              className="ghost"
              type="button"
              onClick={() => {
                setViewMode('visual');
                setShowPreview((prev) => !prev);
              }}
              disabled={saving}
            >
              {showPreview ? 'Hide preview' : 'Preview'}
            </button>
            <button className="pill" type="button" onClick={handlePublish} disabled={saving}>
              {saving ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </header>

        <div className={`blog-editor-body ${showPreview ? 'with-preview' : ''}`.trim()}>
          <main className="blog-editor-canvas">
            <div className="blog-editor-header">
              <input
                className="blog-editor-title"
                placeholder="Write your headline..."
                value={formData.title}
                onChange={handleChange('title')}
              />
              <div className="blog-editor-meta">
                <span className="blog-editor-author">
                  {formData.authorInitials || 'JW'}
                </span>
                <span className="muted small">{formData.authorName || 'Joshua Wolf'}</span>
                <span className="muted small">·</span>
                <span className="muted small">
                  {formData.publishDate || formatDate()}
                </span>
                <span className="muted small">·</span>
                <span className="muted small">
                  {deriveReadTime(formData.contentHtml, formData.readTime)} min read
                </span>
                {formData.lastEdited && (
                  <span className="blog-editor-edited" title={`Last edited: ${formData.lastEdited}`}>
                    Last edited
                  </span>
                )}
              </div>
            </div>
            <div className="blog-editor-toolbar">
              <button type="button" onClick={() => addBlock('paragraph')}>
                + Paragraph section
              </button>
              <button type="button" onClick={() => addBlock('image')}>
                + Image section
              </button>
              <button type="button" onClick={() => addBlock('image-grid')}>
                + Image grid
              </button>
              <button type="button" onClick={() => setIsComposeOpen(true)}>
                Compose
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('visual');
                }}
              >
                Visual
              </button>
              <button
                type="button"
                onClick={() => {
                  lastEditorRef.current = 'html';
                  setViewMode('html');
                }}
              >
                HTML
              </button>
            </div>
            {viewMode === 'html' ? (
              <div className="blog-html-editor">
                <div className="blog-html-toolbar">
                  <button type="button" onClick={() => wrapHtmlSelection('<p>', '</p>')}>
                    Paragraph
                  </button>
                  <button type="button" onClick={() => wrapHtmlSelection('<h2>', '</h2>', 'Heading')}>
                    H2
                  </button>
                  <button type="button" onClick={() => wrapHtmlSelection('<h3>', '</h3>', 'Heading')}>
                    H3
                  </button>
                  <button type="button" onClick={() => wrapHtmlSelection('<strong>', '</strong>')}>
                    Bold
                  </button>
                  <button type="button" onClick={() => wrapHtmlSelection('<em>', '</em>')}>
                    Italic
                  </button>
                  <button type="button" onClick={() => wrapHtmlSelection('<u>', '</u>')}>
                    Underline
                  </button>
                  <button type="button" onClick={() => insertHtmlList('ul')}>
                    Bullet list
                  </button>
                  <button type="button" onClick={() => insertHtmlList('ol')}>
                    Numbered list
                  </button>
                  <button type="button" onClick={insertHtmlLink}>
                    Link
                  </button>
                  <button type="button" onClick={() => wrapHtmlSelection('<blockquote>', '</blockquote>')}>
                    Quote
                  </button>
                  <button type="button" onClick={insertImageToken}>
                    Image token
                  </button>
                </div>
                <textarea
                  ref={htmlEditorRef}
                  rows="14"
                  value={formData.contentHtml}
                  onChange={(event) => {
                    lastEditorRef.current = 'html';
                    handleChange('contentHtml')(event);
                  }}
                  placeholder="Write your story here. Use the toolbar for HTML formatting or <image:Photo title> to place a photo."
                />
              </div>
            ) : (
              <div className="blog-visual-editor">
                <div className="blog-visual-insert">
                  <span className="muted small">Add a new section</span>
                  <div className="blog-visual-insert-actions">
                    <button type="button" onClick={() => addBlock('paragraph')}>
                      + Text
                    </button>
                    <button type="button" onClick={() => addBlock('image')}>
                      + Image
                    </button>
                    <button type="button" onClick={() => addBlock('image-grid')}>
                      + Grid
                    </button>
                  </div>
                </div>
                {contentBlocks.map((block, index) => {
                  if (block.type === 'image') {
                    const selected = findImageByToken(formData.images, block.token);
                    const selectedIndex = selected
                      ? formData.images.findIndex((image) => image.id === selected.id)
                      : -1;
                    return (
                      <div key={block.id} className="blog-visual-block">
                        <div className="blog-visual-block-head">
                          <span className="muted small">Image section</span>
                          <div className="blog-visual-block-actions">
                            <button type="button" onClick={() => moveBlock(index, -1)}>
                              ↑
                            </button>
                            <button type="button" onClick={() => moveBlock(index, 1)}>
                              ↓
                            </button>
                            <button type="button" onClick={() => insertBlockAt(index + 1, 'paragraph')}>
                              + Text
                            </button>
                            <button type="button" onClick={() => insertBlockAt(index + 1, 'image')}>
                              + Image
                            </button>
                            <button
                              type="button"
                              className="ghost"
                              onClick={() => removeBlock(index)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <div className="blog-visual-image">
                          <select
                            value={block.token}
                            onChange={(event) => handleBlockImageChange(index, event.target.value)}
                          >
                            <option value="">Select an image</option>
                            {formData.images.map((image) => (
                              <option key={image.id} value={image.id}>
                                {image.title}
                              </option>
                            ))}
                          </select>
                          {selected ? (
                            <>
                              <img
                                src={selected.url}
                                alt={selected.altText || selected.title}
                                style={{
                                  '--frame-position': `${selected.focusX ?? 50}% ${selected.focusY ?? 50}%`,
                                }}
                              />
                              <div className="blog-visual-image-settings">
                                <label>
                                  Alt text
                                  <input
                                    value={selected.altText ?? ''}
                                    onChange={handleImageUpdate(selectedIndex, 'altText')}
                                    placeholder="Describe the image"
                                  />
                                </label>
                                <label>
                                  Caption
                                  <input
                                    value={selected.caption ?? ''}
                                    onChange={handleImageUpdate(selectedIndex, 'caption')}
                                    placeholder="Optional caption"
                                  />
                                </label>
                                <label>
                                  Link URL
                                  <input
                                    value={selected.linkUrl ?? ''}
                                    onChange={handleImageUpdate(selectedIndex, 'linkUrl')}
                                    placeholder="https://"
                                  />
                                </label>
                                <label className="blog-inline-toggle">
                                  <input
                                    type="checkbox"
                                    checked={selected.openInNewTab ?? false}
                                    onChange={handleImageUpdate(selectedIndex, 'openInNewTab')}
                                  />
                                  Open link in new tab
                                </label>
                              </div>
                            </>
                          ) : (
                            <p className="muted small">Choose an uploaded image to preview it.</p>
                          )}
                        </div>
                      </div>
                    );
                  }
                  if (block.type === 'image-grid') {
                    const slots = Math.max(1, (block.columns ?? 1) * (block.rows ?? 1));
                    return (
                      <div key={block.id} className="blog-visual-block">
                        <div className="blog-visual-block-head">
                          <span className="muted small">Image grid</span>
                          <div className="blog-visual-block-actions">
                            <button type="button" onClick={() => moveBlock(index, -1)}>
                              ↑
                            </button>
                            <button type="button" onClick={() => moveBlock(index, 1)}>
                              ↓
                            </button>
                            <button type="button" onClick={() => insertBlockAt(index + 1, 'paragraph')}>
                              + Text
                            </button>
                            <button type="button" onClick={() => insertBlockAt(index + 1, 'image')}>
                              + Image
                            </button>
                            <button type="button" onClick={() => insertBlockAt(index + 1, 'image-grid')}>
                              + Grid
                            </button>
                            <button
                              type="button"
                              className="ghost"
                              onClick={() => removeBlock(index)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <div className="blog-grid-settings">
                          <label>
                            Columns
                            <input
                              type="number"
                              min="1"
                              max="6"
                              value={block.columns ?? 2}
                              onChange={(event) =>
                                handleBlockGridChange(index, 'columns', Number(event.target.value))
                              }
                            />
                          </label>
                          <label>
                            Rows
                            <input
                              type="number"
                              min="1"
                              max="6"
                              value={block.rows ?? 2}
                              onChange={(event) =>
                                handleBlockGridChange(index, 'rows', Number(event.target.value))
                              }
                            />
                          </label>
                          <label className="blog-grid-caption">
                            Grid text
                            <textarea
                              rows="2"
                              value={block.caption ?? ''}
                              onChange={(event) =>
                                handleBlockGridChange(index, 'caption', event.target.value)
                              }
                              placeholder="Optional caption for this grid"
                            />
                          </label>
                        </div>
                        <div
                          className="blog-grid-picker"
                          style={{
                            '--grid-columns': block.columns ?? 2,
                          }}
                        >
                          {Array.from({ length: slots }).map((_, slotIndex) => (
                            <div key={`${block.id}-slot-${slotIndex}`} className="blog-grid-slot">
                              <label>
                                Slot {slotIndex + 1}
                                <select
                                  value={(block.tokens ?? [])[slotIndex] ?? ''}
                                  onChange={(event) =>
                                    updateGridToken(index, slotIndex, event.target.value)
                                  }
                                >
                                  <option value="">Select an image</option>
                                  {formData.images.map((image) => (
                                    <option key={image.id} value={image.id}>
                                      {image.title}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label>
                                Slot text
                                <textarea
                                  rows="3"
                                  value={(block.texts ?? [])[slotIndex] ?? ''}
                                  onChange={(event) =>
                                    updateGridText(index, slotIndex, event.target.value)
                                  }
                                  placeholder="Add text beside this image"
                                />
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={block.id} className="blog-visual-block">
                      <div className="blog-visual-block-head">
                        <span className="muted small">Text section</span>
                        <div className="blog-visual-block-actions">
                          <button type="button" onClick={() => moveBlock(index, -1)}>
                            ↑
                          </button>
                          <button type="button" onClick={() => moveBlock(index, 1)}>
                            ↓
                          </button>
                          <button type="button" onClick={() => insertBlockAt(index + 1, 'paragraph')}>
                            + Text
                          </button>
                          <button type="button" onClick={() => insertBlockAt(index + 1, 'image')}>
                            + Image
                          </button>
                          <button type="button" onClick={() => insertBlockAt(index + 1, 'image-grid')}>
                            + Grid
                          </button>
                          <button
                            type="button"
                            className="ghost"
                            onClick={() => removeBlock(index)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <textarea
                        rows="4"
                        value={block.text}
                        onChange={(event) => handleBlockChange(index, event.target.value)}
                        placeholder="Write your paragraph..."
                      />
                    </div>
                  );
                })}
              </div>
            )}
            <div className="blog-editor-actions">
              <button className="btn" type="button" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save as Draft'}
              </button>
              <button className="ghost" type="button" onClick={handleDelete} disabled={saving}>
                {isEditing ? 'Delete post' : 'Discard draft'}
              </button>
              {notice && <span className="notice">{notice}</span>}
            </div>

            {formData.images.length > 0 && (
              <div className="blog-image-editor">
                <h3>Image pricing</h3>
                <div className="blog-image-grid">
                  {formData.images.map((image, index) => (
                    <div key={image.id} className="blog-image-card">
                      <img
                        src={image.url}
                        alt={image.title}
                        style={{
                          '--frame-position': `${image.focusX ?? 50}% ${image.focusY ?? 50}%`,
                        }}
                      />
                      <div className="blog-image-card-meta">
                        <div>
                          <p className="blog-image-title">{image.title}</p>
                          <p className="muted small">{image.price} credits</p>
                        </div>
                        <button
                          className="ghost"
                          type="button"
                          onClick={() => setActiveImageIndex(index)}
                        >
                          Settings
                        </button>
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
        {isComposeOpen && (
          <div className="blog-modal-backdrop" role="dialog" aria-modal="true">
            <div className="blog-modal">
              <div className="blog-modal-header">
                <div>
                  <p className="eyebrow">Compose</p>
                  <p className="muted small">Add sections & details</p>
                </div>
                <button className="ghost" type="button" onClick={() => setIsComposeOpen(false)}>
                  Close
                </button>
              </div>
              <div className="blog-modal-body">
                <div className="blog-sidebar-group">
                  <h4>Compose</h4>
                  <button type="button" className="ghost" onClick={() => addBlock('paragraph')}>
                    Add paragraph
                  </button>
                  <button type="button" className="ghost" onClick={() => addBlock('image')}>
                    Add image block
                  </button>
                  <button type="button" className="ghost" onClick={() => addBlock('image-grid')}>
                    Add image grid
                  </button>
                </div>
                <div className="blog-sidebar-group">
                  <h4>Post details</h4>
                  <label>
                    Author initials
                    <input value={formData.authorInitials} onChange={handleChange('authorInitials')} />
                  </label>
                  <label>
                    Author name
                    <input value={formData.authorName} onChange={handleChange('authorName')} />
                  </label>
                  <label>
                    Publish date
                    <input value={formData.publishDate} onChange={handleChange('publishDate')} />
                  </label>
                  <label>
                    Read time (minutes)
                    <input
                      type="number"
                      min="1"
                      value={formData.readTime}
                      onChange={handleChange('readTime')}
                    />
                  </label>
                  <label>
                    Title
                    <input value={formData.title} onChange={handleChange('title')} />
                  </label>
                  <label>
                    Date
                    <input value={formData.date} onChange={handleChange('date')} />
                  </label>
                  <label>
                    Tag
                    <input value={formData.tag} onChange={handleChange('tag')} />
                  </label>
                  <label>
                    Excerpt
                    <textarea rows="3" value={formData.excerpt} onChange={handleChange('excerpt')} />
                  </label>
                </div>
                <div className="blog-sidebar-group">
                  <h4>Images</h4>
                  <div
                    className={`blog-upload ${dragActive ? 'active' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div>
                      <p className="muted small">Drag & drop to upload</p>
                    </div>
                    <input type="file" accept="image/*" multiple onChange={handleImageUpload} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeImageIndex !== null && formData.images[activeImageIndex] && (
          <div className="blog-modal-backdrop" role="dialog" aria-modal="true">
            <div className="blog-modal">
              <div className="blog-modal-header">
                <div>
                  <p className="eyebrow">Image settings</p>
                  <p className="muted small">{formData.images[activeImageIndex].title}</p>
                </div>
                <button className="ghost" type="button" onClick={() => setActiveImageIndex(null)}>
                  Close
                </button>
              </div>
              <div className="blog-modal-body">
                <label>
                  Title
                  <input
                    value={formData.images[activeImageIndex].title}
                    onChange={handleImageUpdate(activeImageIndex, 'title')}
                  />
                </label>
                <label>
                  Alt text
                  <input
                    value={formData.images[activeImageIndex].altText}
                    onChange={handleImageUpdate(activeImageIndex, 'altText')}
                  />
                </label>
                <label>
                  Caption
                  <input
                    value={formData.images[activeImageIndex].caption}
                    onChange={handleImageUpdate(activeImageIndex, 'caption')}
                  />
                </label>
                <label>
                  Link URL
                  <input
                    value={formData.images[activeImageIndex].linkUrl}
                    onChange={handleImageUpdate(activeImageIndex, 'linkUrl')}
                  />
                </label>
                <label className="blog-inline-toggle">
                  <input
                    type="checkbox"
                    checked={formData.images[activeImageIndex].openInNewTab ?? false}
                    onChange={handleImageUpdate(activeImageIndex, 'openInNewTab')}
                  />
                  Open link in new tab
                </label>
                <label>
                  Price (credits)
                  <input
                    type="number"
                    min="1"
                    value={formData.images[activeImageIndex].price}
                    onChange={handleImageUpdate(activeImageIndex, 'price')}
                  />
                </label>
                <label>
                  Frame X
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.images[activeImageIndex].focusX ?? 50}
                    onChange={handleImageUpdate(activeImageIndex, 'focusX')}
                  />
                </label>
                <label>
                  Frame Y
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.images[activeImageIndex].focusY ?? 50}
                    onChange={handleImageUpdate(activeImageIndex, 'focusY')}
                  />
                </label>
                <div className="blog-modal-actions">
                  <button
                    className="pill"
                    type="button"
                    onClick={() => insertImageIntoContent(formData.images[activeImageIndex])}
                  >
                    Insert into article
                  </button>
                  <button
                    className="ghost"
                    type="button"
                    onClick={() => {
                      handleRemoveImage(activeImageIndex);
                      setActiveImageIndex(null);
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </Layout>
  );
};

export default BlogEditorPage;
