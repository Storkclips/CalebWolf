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
  }));

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
    const value = ['price', 'focusX', 'focusY'].includes(field)
      ? Number(event.target.value)
      : event.target.value;
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

  const handleSave = (event) => {
    event?.preventDefault?.();

    if (!formData.title || !formData.excerpt) {
      setNotice('Add a title and excerpt before saving.');
      return;
    }

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
      images: formData.images ?? [],
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
            <button className="ghost" type="button" onClick={() => setViewMode('visual')}>
              Preview
            </button>
            <button className="pill" type="button" onClick={handleSave}>
              Publish
            </button>
          </div>
        </header>

        <div className="blog-editor-body">
          <aside className="blog-editor-sidebar">
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
                <span className="muted small">By Caleb Wolf Photography</span>
              </div>
            </div>
            <div className="blog-editor-toolbar">
              <button type="button" onClick={() => addBlock('paragraph')}>
                + Paragraph
              </button>
              <button type="button" onClick={() => addBlock('image')}>
                + Image
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
                {contentBlocks.map((block, index) => {
                  if (block.type === 'image') {
                    const selected = findImageByToken(formData.images, block.token);
                    return (
                      <div key={block.id} className="blog-visual-block">
                        <div className="blog-visual-block-head">
                          <span className="muted small">Image block</span>
                          <button
                            type="button"
                            className="ghost"
                            onClick={() => removeBlock(index)}
                          >
                            Remove
                          </button>
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
                            <img
                              src={selected.url}
                              alt={selected.title}
                              style={{
                                '--frame-position': `${selected.focusX ?? 50}% ${selected.focusY ?? 50}%`,
                              }}
                            />
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
                        <span className="muted small">Paragraph</span>
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => removeBlock(index)}
                        >
                          Remove
                        </button>
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
            <div className="blog-editor-preview">
              <p className="muted small">Live preview</p>
              <div className="blog-body" dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
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
        </div>
      </section>
    </Layout>
  );
};

export default BlogEditorPage;
