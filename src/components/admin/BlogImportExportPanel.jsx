import { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../utils/blog';

/* ─────────────────────────────────────────────
   Template text
───────────────────────────────────────────── */
const TEMPLATE_TEXT = `# Blog Post Template
# Lines starting with # are comments and are ignored during import.
# Copy this block for each post. Separate multiple posts with ===

TITLE: Your Post Title Here
TAG: Travel
EXCERPT: A short 1-2 sentence summary shown in the post listing.
DATE: June 2026
PUBLISH_DATE: 2026-06-01
RELEASE_DATE: 2026-06-15T09:00
READ_TIME: 5
AUTHOR_NAME: Your Name
AUTHOR_INITIALS: YN
PUBLISHED: true

# IMAGE_URL lines add images to the post. The FIRST one is the header/cover image.
# Add as many as you need — each gets its own line.
IMAGE_URL: https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg
IMAGE_URL: https://images.pexels.com/photos/1562058/pexels-photo-1562058.jpeg

CONTENT:
Write your full post content here. This can span multiple lines.

You can use blank lines to create paragraphs. Basic HTML is also supported
if you want more control, e.g. <strong>bold</strong> or <em>italic</em>.

Each paragraph will be wrapped in <p> tags automatically if you don't
include HTML tags yourself.

===

TITLE: Second Post Title
TAG: Landscape
EXCERPT: Another short summary for the second post.
DATE: May 2026
PUBLISH_DATE: 2026-05-15
READ_TIME: 3
AUTHOR_NAME: Your Name
AUTHOR_INITIALS: YN
PUBLISHED: false

IMAGE_URL: https://images.pexels.com/photos/1366919/pexels-photo-1366919.jpeg

CONTENT:
Content for the second post goes here.

Add as many === separated blocks as you need for bulk import.
`;

/* ─────────────────────────────────────────────
   Parse helpers
───────────────────────────────────────────── */
const FIELD_RE = /^(TITLE|TAG|EXCERPT|DATE|PUBLISH_DATE|RELEASE_DATE|READ_TIME|AUTHOR_NAME|AUTHOR_INITIALS|PUBLISHED|IMAGE_URL):\s*(.*)$/i;

const parsePostBlock = (block) => {
  const lines = block.split('\n').filter((l) => !l.trimStart().startsWith('#'));
  const post = {
    title: '',
    tag: '',
    excerpt: '',
    date: '',
    publishDate: '',
    scheduledAt: null,
    readTime: '',
    authorName: '',
    authorInitials: '',
    published: false,
    contentHtml: '',
    imageUrls: [],
  };

  let inContent = false;
  const contentLines = [];

  for (const raw of lines) {
    const line = raw;
    if (/^CONTENT:\s*$/i.test(line.trim())) { inContent = true; continue; }
    if (inContent) { contentLines.push(line); continue; }
    const m = FIELD_RE.exec(line.trim());
    if (!m) continue;
    const key = m[1].toUpperCase();
    const val = m[2].trim();
    if (key === 'TITLE') post.title = val;
    else if (key === 'TAG') post.tag = val;
    else if (key === 'EXCERPT') post.excerpt = val;
    else if (key === 'DATE') post.date = val;
    else if (key === 'PUBLISH_DATE') post.publishDate = val;
    else if (key === 'RELEASE_DATE') post.scheduledAt = val ? new Date(val).toISOString() : null;
    else if (key === 'READ_TIME') post.readTime = val;
    else if (key === 'AUTHOR_NAME') post.authorName = val;
    else if (key === 'AUTHOR_INITIALS') post.authorInitials = val;
    else if (key === 'PUBLISHED') post.published = /^true$/i.test(val);
    else if (key === 'IMAGE_URL' && val) post.imageUrls.push(val);
  }

  // Convert plain paragraphs to HTML if no HTML tags present
  const rawContent = contentLines.join('\n').trim();
  const hasHtml = /<\/?[a-z][\s\S]*>/i.test(rawContent);
  if (rawContent) {
    if (hasHtml) {
      post.contentHtml = rawContent;
    } else {
      post.contentHtml = rawContent
        .split(/\n{2,}/)
        .map((p) => `<p>${p.replace(/\n/g, '<br />')}</p>`)
        .join('\n');
    }
  }

  return post;
};

const parseDocument = (text) => {
  // Strip comment lines at top level, split on ===
  const blocks = text.split(/^={3,}\s*$/m);
  return blocks
    .map((b) => parsePostBlock(b.trim()))
    .filter((p) => p.title.trim());
};

/* Extract readable text from a PDF ArrayBuffer using a simple approach */
const extractTextFromPdf = async (buffer) => {
  // Convert to text by reading the raw PDF stream for /Contents or BT...ET blocks
  const bytes = new Uint8Array(buffer);
  const decoder = new TextDecoder('latin1');
  const raw = decoder.decode(bytes);

  // Extract text from PDF BT...ET blocks (Basic text extraction, no lib needed)
  const textParts = [];
  const btEtRe = /BT([\s\S]*?)ET/g;
  const tjRe = /\(([^)]*)\)\s*T[Jj]/g;
  let btMatch;
  while ((btMatch = btEtRe.exec(raw)) !== null) {
    const block = btMatch[1];
    let tjMatch;
    while ((tjMatch = tjRe.exec(block)) !== null) {
      textParts.push(tjMatch[1]);
    }
  }

  if (textParts.length > 0) return textParts.join(' ');

  // Fallback: extract printable ASCII sequences
  return raw.replace(/[^\x20-\x7E\n]/g, ' ').replace(/ {3,}/g, '\n').trim();
};

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
const BlogImportExportPanel = ({ onImportComplete }) => {
  const [parsed, setParsed] = useState([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  /* ── Template download ── */
  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_TEXT], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'blog-post-template.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── File processing ── */
  const processFile = async (file) => {
    setError(null);
    setParsed([]);
    setResults(null);

    const ext = file.name.split('.').pop().toLowerCase();
    let text = '';

    try {
      if (ext === 'pdf') {
        const buffer = await file.arrayBuffer();
        text = await extractTextFromPdf(buffer);
      } else {
        // txt, doc, docx — read as text (Word docs in older format are XML/binary,
        // but modern .docx saved as plain text works; .doc may degrade gracefully)
        text = await file.text();
        // Strip XML/binary noise from docx
        if (ext === 'docx' || ext === 'doc') {
          // Extract readable text from XML tags like <w:t>
          const xmlText = text.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
          if (xmlText) {
            text = xmlText.map((t) => t.replace(/<[^>]+>/g, '')).join(' ');
          } else {
            // Strip all XML tags as fallback
            text = text.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, '\n').trim();
          }
        }
      }

      if (!text.trim()) {
        setError('Could not extract text from this file. Try saving as .txt.');
        return;
      }

      const posts = parseDocument(text);
      if (posts.length === 0) {
        setError('No valid posts found. Make sure your file uses the template format with TITLE:, CONTENT:, etc.');
        return;
      }
      setParsed(posts);
    } catch (e) {
      setError(`Failed to read file: ${e.message}`);
    }
  };

  const handleFiles = (files) => {
    const file = files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  /* ── Import ── */
  const handleImport = async () => {
    if (!parsed.length) return;
    setImporting(true);
    setResults(null);

    let succeeded = 0;
    let failed = 0;

    for (const post of parsed) {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const { error: err } = await supabase.from('blog_posts').insert({
        id,
        title: post.title,
        date: post.date || formatDate(),
        excerpt: post.excerpt,
        tag: post.tag || '',
        content_html: post.contentHtml || '',
        published: post.published,
        author_name: post.authorName || '',
        author_initials: post.authorInitials || '',
        publish_date: post.publishDate || '',
        read_time: post.readTime ? Number(post.readTime) : null,
        last_edited: now,
        scheduled_at: post.scheduledAt || null,
      });

      if (err) { failed++; console.error('Import error', err); continue; }

      // Insert images — first one is the header/cover
      if (post.imageUrls?.length) {
        const imageRows = post.imageUrls.map((url, i) => ({
          id: crypto.randomUUID(),
          post_id: id,
          title: i === 0 ? `${post.title} — Header` : `Image ${i + 1}`,
          url,
          price: 3,
          sort_order: i,
          focus_x: 50,
          focus_y: 50,
          alt_text: '',
          caption: '',
          link_url: '',
          open_in_new_tab: false,
        }));
        await supabase.from('blog_images').insert(imageRows);
      }

      succeeded++;
    }

    setResults({ succeeded, failed });
    setImporting(false);
    if (succeeded > 0) {
      setParsed([]);
      onImportComplete?.();

      // Auto-migrate any external (Wix) image URLs to Supabase storage
      try {
        const session = (await supabase.auth.getSession()).data.session;
        if (session) {
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/migrate-external-images`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
              Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ scope: 'blog' }),
          });
        }
      } catch {
        // Non-fatal — images still work through the proxy
      }
    }
  };

  const clearPreview = () => {
    setParsed([]);
    setResults(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="adm-panel">
      <div className="adm-panel-header">
        <div>
          <p className="eyebrow">Blog</p>
          <h2>Import / Export</h2>
          <p className="muted">Bulk-upload posts from .txt, .pdf, or Word files, or download the template.</p>
        </div>
      </div>

      <div className="bimp-layout">
        {/* ── Left: Template & instructions ── */}
        <div className="bimp-sidebar">
          <div className="bimp-card">
            <div className="bimp-card-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <h3>Download template</h3>
            <p className="muted small">Get the <code>.txt</code> template with all supported fields. Open in any text editor, Notion, Word, or Google Docs.</p>
            <button type="button" className="btn" style={{ marginTop: 14, width: '100%' }} onClick={downloadTemplate}>
              Download template.txt
            </button>
          </div>

          <div className="bimp-help">
            <p className="bimp-help-title">Format guide</p>
            <ul className="bimp-help-list">
              <li><code>TITLE:</code> Post headline (required)</li>
              <li><code>TAG:</code> Category label</li>
              <li><code>EXCERPT:</code> Short summary</li>
              <li><code>DATE:</code> e.g. <em>June 2026</em></li>
              <li><code>PUBLISHED:</code> <code>true</code> or <code>false</code></li>
              <li><code>READ_TIME:</code> Minutes as a number</li>
              <li><code>AUTHOR_NAME:</code> Display name</li>
              <li><code>IMAGE_URL:</code> Image URL — repeat for multiple. First one is the header/cover.</li>
              <li><code>CONTENT:</code> Full post body (last field)</li>
            </ul>
            <p className="muted small" style={{ marginTop: 10 }}>Separate multiple posts with <code>===</code> on its own line.</p>
          </div>
        </div>

        {/* ── Right: Upload & preview ── */}
        <div className="bimp-main">
          {/* Drop zone */}
          <div
            className={`bimp-dropzone${dragOver ? ' drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <p className="bimp-dropzone-label">Drop a file here or click to browse</p>
            <p className="muted small">.txt &nbsp;·&nbsp; .pdf &nbsp;·&nbsp; .doc &nbsp;·&nbsp; .docx</p>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.pdf,.doc,.docx,text/plain,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              style={{ display: 'none' }}
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {error && (
            <div className="auth-error" style={{ marginTop: 12 }}>{error}</div>
          )}

          {results && (
            <div className={results.failed > 0 ? 'auth-error' : 'notice'} style={{ marginTop: 12 }}>
              {results.succeeded > 0 && `Imported ${results.succeeded} post${results.succeeded !== 1 ? 's' : ''} successfully.`}
              {results.failed > 0 && ` ${results.failed} failed — check the console for details.`}
            </div>
          )}

          {/* Preview table */}
          {parsed.length > 0 && (
            <div className="bimp-preview">
              <div className="bimp-preview-header">
                <span className="bimp-preview-count">{parsed.length} post{parsed.length !== 1 ? 's' : ''} ready to import</span>
                <button type="button" className="ghost" style={{ fontSize: 12 }} onClick={clearPreview}>Clear</button>
              </div>

              <div className="bimp-preview-list">
                {parsed.map((p, i) => (
                  <div key={i} className="bimp-preview-item">
                    <div className="bimp-preview-item-head">
                      <span className="bimp-preview-title">{p.title || <em className="muted">Untitled</em>}</span>
                      <span className={`status-badge ${p.published ? 'published' : 'draft'}`}>
                        {p.published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    <div className="bimp-preview-meta">
                      {p.tag && <span className="tag">{p.tag}</span>}
                      {p.date && <span className="muted small">{p.date}</span>}
                      {p.imageUrls?.length > 0 && (
                        <span className="muted small">
                          {p.imageUrls.length} image{p.imageUrls.length !== 1 ? 's' : ''} (first = header)
                        </span>
                      )}
                      {p.excerpt && <span className="muted small bimp-excerpt">{p.excerpt}</span>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="bimp-preview-footer">
                <button
                  type="button"
                  className="btn"
                  onClick={handleImport}
                  disabled={importing}
                >
                  {importing ? 'Importing…' : `Import ${parsed.length} post${parsed.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlogImportExportPanel;
