import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { defaultBlogPosts } from '../data';
import { formatDate, getStoredPosts, renderBlogContent, savePosts, slugify } from '../utils/blog';

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

  const parts = value.split(/(<image:[^>]+>)/gi);
  const blocks = [];

  parts.forEach((part) => {
    if (!part) return;
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
  const [posts, setPosts] = useState(defaultBlogPosts);
  const [formData, setFormData] = useState(emptyForm);
  const [notice, setNotice] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [viewMode, setViewMode] = useState('visual');
  const [contentBlocks, setContentBlocks] = useState(() => parseContentBlocks(''));
  const [showPreview, setShowPreview] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const lastEditorRef = useRef('visual');

  const isEditing = Boolean(postId);

  useEffect(() => {
    const stored = getStoredPosts();
    setPosts(stored);
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

  const persistPosts = (nextPosts) => {
    setPosts(nextPosts);
    savePosts(nextPosts);
  };

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
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

  const addBlock = (type) => {
    const nextBlock =
      type === 'image'
        ? { id: createBlockId(), type: 'image', token: '' }
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

  const handleSave = (event, overrides = {}) => {
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
    };

    const nextPosts = isEditing
      ? posts.map((post) => (post.id === postId ? nextPost : post))
      : [nextPost, ...posts];

    persistPosts(nextPosts);
    setNotice('Blog saved locally for testing.');
    if (!isEditing) {
      navigate(`/blog/${nextPost.id}/edit`);
    }
  };

  const handleDelete = () => {
    if (!isEditing) {
      navigate('/blog');
      return;
    }
    const nextPosts = posts.filter((post) => post.id !== postId);
    persistPosts(nextPosts);
    navigate('/blog');
  };

  const handlePublish = () => {
    const publishDate = formData.publishDate || formatDate();
    handleSave(undefined, {
      publishDate,
      lastEdited: formatFullDate(),
    });
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
            <button className="ghost" type="button" onClick={handleSave}>
              Save
            </button>
            <button
              className="ghost"
              type="button"
              onClick={() => {
                setViewMode('visual');
                setShowPreview((prev) => !prev);
              }}
            >
              {showPreview ? 'Hide preview' : 'Preview'}
            </button>
            <button className="pill" type="button" onClick={handlePublish}>
              Publish
            </button>
          </div>
        </header>

        <div
          className={`blog-editor-body ${showPreview ? 'with-preview' : ''} ${
            sidebarCollapsed ? 'sidebar-collapsed' : ''
          }`.trim()}
        >
          <aside className={`blog-editor-sidebar ${sidebarCollapsed ? 'is-collapsed' : ''}`.trim()}>
            <div className="blog-sidebar-header">
              <div>
                <p className="eyebrow">Compose</p>
                <p className="muted small">Add sections & details</p>
              </div>
              <button
                className="ghost"
                type="button"
                onClick={() => setSidebarCollapsed((prev) => !prev)}
                aria-expanded={!sidebarCollapsed}
              >
                {sidebarCollapsed ? 'Expand' : 'Collapse'}
              </button>
            </div>
            <div className="blog-sidebar-group">
              <h4>Compose</h4>
              <button type="button" className="ghost" onClick={() => addBlock('paragraph')}>
                Add paragraph
              </button>
              <button type="button" className="ghost" onClick={() => addBlock('image')}>
                Add image block
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
          </aside>

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
              <textarea
                className="blog-html-editor"
                rows="14"
                value={formData.contentHtml}
                onChange={(event) => {
                  lastEditorRef.current = 'html';
                  handleChange('contentHtml')(event);
                }}
                placeholder="Write your story here. Use <image:Photo title> to place a photo."
              />
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
              <button className="btn" type="button" onClick={handleSave}>
                Save blog post
              </button>
              <button className="ghost" type="button" onClick={handleDelete}>
                {isEditing ? 'Delete post' : 'Discard draft'}
              </button>
              {notice && <span className="notice">{notice}</span>}
            </div>

            {formData.images.length > 0 && (
              <div className="blog-image-editor">
                <h3>Image pricing</h3>
                {formData.images.map((image, index) => (
                  <div key={image.id} className="blog-image-row">
                    <img
                      src={image.url}
                      alt={image.title}
                      style={{
                        '--frame-position': `${image.focusX ?? 50}% ${image.focusY ?? 50}%`,
                      }}
                    />
                    <div className="blog-image-fields">
                      <label>
                        Title
                        <input value={image.title} onChange={handleImageUpdate(index, 'title')} />
                      </label>
                      <label>
                        Alt text
                        <input value={image.altText} onChange={handleImageUpdate(index, 'altText')} />
                      </label>
                      <label>
                        Caption
                        <input value={image.caption} onChange={handleImageUpdate(index, 'caption')} />
                      </label>
                      <label>
                        Link URL
                        <input value={image.linkUrl} onChange={handleImageUpdate(index, 'linkUrl')} />
                      </label>
                      <label className="blog-inline-toggle">
                        <input
                          type="checkbox"
                          checked={image.openInNewTab ?? false}
                          onChange={handleImageUpdate(index, 'openInNewTab')}
                        />
                        Open link in new tab
                      </label>
                      <label>
                        Price (credits)
                        <input
                          type="number"
                          min="1"
                          value={image.price}
                          onChange={handleImageUpdate(index, 'price')}
                        />
                      </label>
                      <label>
                        Frame X
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={image.focusX ?? 50}
                          onChange={handleImageUpdate(index, 'focusX')}
                        />
                      </label>
                      <label>
                        Frame Y
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={image.focusY ?? 50}
                          onChange={handleImageUpdate(index, 'focusY')}
                        />
                      </label>
                      <button
                        className="pill"
                        type="button"
                        onClick={() => insertImageIntoContent(image)}
                      >
                        Insert into article
                      </button>
                      <button
                        className="ghost"
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
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
      </section>
    </Layout>
  );
};

export default BlogEditorPage;
