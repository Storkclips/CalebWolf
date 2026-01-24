import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { defaultBlogPosts } from '../data';
import { formatDate, getStoredPosts, renderBlogContent, savePosts, slugify, toEditableHtml } from '../utils/blog';

const emptyForm = {
  id: '',
  title: '',
  date: '',
  excerpt: '',
  tag: '',
  contentHtml: '',
  images: [],
};

const BlogEditorPage = () => {
  const navigate = useNavigate();
  const { postId } = useParams();
  const [posts, setPosts] = useState(defaultBlogPosts);
  const [formData, setFormData] = useState(emptyForm);
  const [notice, setNotice] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [viewMode, setViewMode] = useState('visual');
  const editorRef = useRef(null);

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
      return;
    }
    const target = posts.find((post) => post.id === postId);
    if (target) {
      setFormData({
        ...target,
        contentHtml: target.contentHtml ?? target.content ?? '',
        images: target.images ?? [],
      });
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

  const handleContentInput = (event) => {
    setFormData((prev) => ({
      ...prev,
      contentHtml: event.currentTarget.innerText,
    }));
  };

  const applyFormat = (command, value = null) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    setFormData((prev) => ({
      ...prev,
      contentHtml: editorRef.current.innerHTML,
    }));
  };

  const handlePreviewSync = () => {
    if (!editorRef.current) return;
    editorRef.current.innerHTML = toEditableHtml(formData.contentHtml);
  };

  const insertImageIntoContent = (image) => {
    const html = `<image:${image.title}>`;
    if (viewMode === 'html') {
      setFormData((prev) => ({
        ...prev,
        contentHtml: `${prev.contentHtml}${prev.contentHtml ? '\n' : ''}${html}`,
      }));
      return;
    }
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand('insertText', false, html);
    setFormData((prev) => ({
      ...prev,
      contentHtml: editorRef.current.innerText,
    }));
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
    const value = field === 'price' ? Number(event.target.value) : event.target.value;
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
              <button type="button" className="ghost" onClick={() => applyFormat('formatBlock', 'h2')}>
                Heading
              </button>
              <button type="button" className="ghost" onClick={() => applyFormat('bold')}>
                Bold
              </button>
              <button type="button" className="ghost" onClick={() => applyFormat('italic')}>
                Italic
              </button>
              <button type="button" className="ghost" onClick={() => applyFormat('insertUnorderedList')}>
                Bullet list
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
              <button type="button" onClick={() => applyFormat('bold')}>
                B
              </button>
              <button type="button" onClick={() => applyFormat('italic')}>
                I
              </button>
              <button type="button" onClick={() => applyFormat('underline')}>
                U
              </button>
              <button type="button" onClick={() => applyFormat('insertOrderedList')}>
                1.
              </button>
              <button type="button" onClick={() => applyFormat('insertUnorderedList')}>
                •
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('visual');
                  handlePreviewSync();
                }}
              >
                Visual
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('html');
                  handlePreviewSync();
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
                onChange={handleChange('contentHtml')}
                placeholder="Write your story here. Use <image:Photo title> to place a photo."
              />
            ) : (
              <div
                className="blog-editor-content"
                contentEditable
                suppressContentEditableWarning
                ref={editorRef}
                onInput={handleContentInput}
                dangerouslySetInnerHTML={{ __html: toEditableHtml(formData.contentHtml) }}
              />
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
                    <img src={image.url} alt={image.title} />
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
