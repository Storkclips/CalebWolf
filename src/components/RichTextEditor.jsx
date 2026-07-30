import { useRef, useState, useCallback, useEffect } from 'react';
import ImagePickerModal from './ImagePickerModal';

const exec = (cmd, val = null) => {
  document.execCommand(cmd, false, val);
};

const SIZE_MAP = {
  small: '280px',
  medium: '400px',
  large: '520px',
  full: '100%',
};

const ALIGN_MARGIN = {
  left: '0 auto 16px 0',
  center: '0 auto 16px',
  right: '0 0 16px auto',
};

const buildImageHtml = ({ url, alt, caption, size = 'full', align = 'center' }) => {
  const maxW = SIZE_MAP[size] || SIZE_MAP.full;
  const margin = ALIGN_MARGIN[align] || ALIGN_MARGIN.center;
  const cap = caption
    ? `<p class="rte-img-caption" style="margin:6px 0 0;font-size:13px;color:#888;font-style:italic;">${caption}</p>`
    : '';
  return `<figure class="rte-fig" data-size="${size}" data-align="${align}" contenteditable="false" style="margin:${margin};max-width:${maxW};">
    <img src="${url}" alt="${alt || ''}" class="rte-fig-img" style="width:100%;border-radius:10px;display:block;" />
    ${cap}
  </figure><p><br/></p>`;
};

const buildGridHtml = ({ cols = 2, rows = 2, urls = [], shape = 'rounded', border = 'solid', borderWidth = 2, borderColor = '#3a3a4a', opacity = 1, fit = 'cover', gap = 12 }) => {
  const slots = Math.max(1, cols * rows);
  const radius = shape === 'square' ? '0' : shape === 'pill' ? '50%' : '10px';
  const bStyle = border === 'none' ? 'none' : border;
  const bWidth = border === 'none' ? '0' : `${borderWidth}px`;
  const items = [];
  for (let i = 0; i < slots; i += 1) {
    const url = urls[i] || '';
    const objFit = fit === 'contain' ? 'contain' : 'cover';
    const pad = fit === 'border' ? '6px' : '0';
    if (url) {
      items.push(`<div class="rte-grid-cell" style="border-radius:${radius};border:${bWidth} ${bStyle} ${borderColor};opacity:${opacity};padding:${pad};"><img src="${url}" style="width:100%;height:100%;object-fit:${objFit};border-radius:${radius};display:block;" /></div>`);
    } else {
      items.push(`<div class="rte-grid-cell rte-grid-empty" style="border-radius:${radius};border:${bWidth} ${bStyle} ${borderColor};opacity:${opacity};"></div>`);
    }
  }
  return `<div class="rte-grid" data-cols="${cols}" data-rows="${rows}" data-shape="${shape}" data-border="${border}" data-border-width="${borderWidth}" data-border-color="${borderColor}" data-opacity="${opacity}" data-fit="${fit}" data-gap="${gap}" contenteditable="false" style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:${gap}px;margin:0 0 16px;">${items.join('')}</div><p><br/></p>`;
};

const TOOLBAR_GROUPS = [
  [
    { cmd: 'bold', icon: 'B', label: 'Bold', style: { fontWeight: 700 }, title: 'Bold' },
    { cmd: 'italic', icon: 'I', label: 'Italic', style: { fontStyle: 'italic' }, title: 'Italic' },
    { cmd: 'underline', icon: 'U', label: 'Underline', style: { textDecoration: 'underline' }, title: 'Underline' },
    { cmd: 'strikeThrough', icon: 'S', label: 'Strikethrough', style: { textDecoration: 'line-through' }, title: 'Strikethrough' },
  ],
  [
    { cmd: 'formatBlock', val: '<h1>', icon: 'H1', label: 'Heading 1', title: 'Heading 1' },
    { cmd: 'formatBlock', val: '<h2>', icon: 'H2', label: 'Heading 2', title: 'Heading 2' },
    { cmd: 'formatBlock', val: '<h3>', icon: 'H3', label: 'Heading 3', title: 'Heading 3' },
    { cmd: 'formatBlock', val: '<p>', icon: '¶', label: 'Paragraph', title: 'Paragraph' },
  ],
  [
    { cmd: 'insertUnorderedList', icon: '•', label: 'Bullet list', title: 'Bullet list' },
    { cmd: 'insertOrderedList', icon: '1.', label: 'Numbered list', title: 'Numbered list' },
    { cmd: 'formatBlock', val: '<blockquote>', icon: '"', label: 'Quote', title: 'Block quote' },
  ],
  [
    { cmd: 'justifyLeft', icon: '⇤', label: 'Align left', title: 'Align left' },
    { cmd: 'justifyCenter', icon: '⇔', label: 'Align center', title: 'Align center' },
    { cmd: 'justifyRight', icon: '⇥', label: 'Align right', title: 'Align right' },
  ],
  [
    { cmd: 'createLink', icon: '🔗', label: 'Insert link', title: 'Insert link', hasInput: true },
    { cmd: 'insertImage', icon: '🖼', label: 'Insert image', title: 'Insert image', isImage: true },
    { cmd: 'grid', icon: '▦', label: 'Insert grid', title: 'Insert image grid', isGrid: true },
    { cmd: 'insertHorizontalRule', icon: '―', label: 'Divider', title: 'Horizontal rule' },
  ],
  [
    { cmd: 'removeFormat', icon: '⌫', label: 'Clear formatting', title: 'Clear formatting' },
    { cmd: 'undo', icon: '↶', label: 'Undo', title: 'Undo' },
    { cmd: 'redo', icon: '↷', label: 'Redo', title: 'Redo' },
  ],
];

const RichTextEditor = ({ value, onChange, placeholder = 'Write your message…' }) => {
  const editorRef = useRef(null);
  const lastEmitted = useRef('');
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showGridModal, setShowGridModal] = useState(false);
  const [activeCmds, setActiveCmds] = useState({});
  const [imgPopover, setImgPopover] = useState(null);

  useEffect(() => {
    if (!editorRef.current) return;
    if (value === undefined) return;
    if (value === lastEmitted.current) return;
    editorRef.current.innerHTML = value;
    lastEmitted.current = value;
  }, [value]);

  const syncActive = useCallback(() => {
    const next = {};
    ['bold', 'italic', 'underline', 'strikeThrough'].forEach((c) => {
      next[c] = document.queryCommandState(c);
    });
    const block = document.queryCommandValue('formatBlock');
    next.block = block;
    ['insertUnorderedList', 'insertOrderedList', 'justifyLeft', 'justifyCenter', 'justifyRight'].forEach((c) => {
      next[c] = document.queryCommandState(c);
    });
    setActiveCmds(next);
  }, []);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      lastEmitted.current = html;
      onChange(html);
    }
    syncActive();
  }, [onChange, syncActive]);

  const handleToolbar = (item) => {
    if (item.isImage) {
      setShowImagePicker(true);
      return;
    }
    if (item.isGrid) {
      setShowGridModal(true);
      return;
    }

    if (item.hasInput && item.cmd === 'createLink') {
      const url = window.prompt('Enter the URL:');
      if (!url) return;
      exec(item.cmd, url);
      handleInput();
      return;
    }

    exec(item.cmd, item.val);
    handleInput();
    syncActive();
  };

  const handleImageInsert = (imgHtml) => {
    editorRef.current?.focus();
    exec('insertHTML', imgHtml);
    handleInput();
  };

  const handleImagePickData = ({ url, alt, caption }) => {
    const html = buildImageHtml({ url, alt, caption, size: 'full', align: 'center' });
    editorRef.current?.focus();
    exec('insertHTML', html);
    handleInput();
  };

  const handleGridInsert = (gridHtml) => {
    editorRef.current?.focus();
    exec('insertHTML', gridHtml);
    handleInput();
  };

  const isActive = (item) => {
    if (activeCmds[item.cmd]) return true;
    if (item.cmd === 'formatBlock' && activeCmds.block) {
      const tag = activeCmds.block.toLowerCase().replace(/[<>]/g, '');
      const val = item.val.toLowerCase().replace(/[<>]/g, '');
      return tag === val;
    }
    return false;
  };

  // Click handler for images inside the editor
  const handleEditorClick = (e) => {
    const fig = e.target.closest('.rte-fig');
    const grid = e.target.closest('.rte-grid');
    if (fig) {
      const rect = fig.getBoundingClientRect();
      const editorRect = editorRef.current.getBoundingClientRect();
      setImgPopover({
        type: 'image',
        el: fig,
        x: rect.left - editorRect.left,
        y: rect.top - editorRect.top + rect.height + 6,
        size: fig.dataset.size || 'full',
        align: fig.dataset.align || 'center',
      });
      return;
    }
    if (grid) {
      const rect = grid.getBoundingClientRect();
      const editorRect = editorRef.current.getBoundingClientRect();
      setImgPopover({
        type: 'grid',
        el: grid,
        x: rect.left - editorRect.left,
        y: rect.top - editorRect.top + rect.height + 6,
        cols: Number(grid.dataset.cols) || 2,
        rows: Number(grid.dataset.rows) || 2,
        shape: grid.dataset.shape || 'rounded',
        border: grid.dataset.border || 'solid',
        borderWidth: Number(grid.dataset.borderWidth) || 2,
        borderColor: grid.dataset.borderColor || '#3a3a4a',
        opacity: Number(grid.dataset.opacity) || 1,
        fit: grid.dataset.fit || 'cover',
        gap: Number(grid.dataset.gap) || 12,
      });
      return;
    }
    if (imgPopover) setImgPopover(null);
  };

  const applyImageStyle = (field, val) => {
    if (!imgPopover || imgPopover.type !== 'image') return;
    const fig = imgPopover.el;
    if (!fig) return;
    fig.dataset[field] = val;
    if (field === 'size') {
      fig.style.maxWidth = SIZE_MAP[val] || SIZE_MAP.full;
    }
    if (field === 'align') {
      fig.style.margin = ALIGN_MARGIN[val] || ALIGN_MARGIN.center;
    }
    setImgPopover({ ...imgPopover, [field]: val });
    handleInput();
  };

  const applyGridStyle = (field, val) => {
    if (!imgPopover || imgPopover.type !== 'grid') return;
    const grid = imgPopover.el;
    if (!grid) return;
    grid.dataset[field] = val;
    if (field === 'gap') {
      grid.style.gap = `${val}px`;
    }
    if (field === 'cols') {
      grid.style.gridTemplateColumns = `repeat(${val},1fr)`;
    }
    if (field === 'shape' || field === 'border' || field === 'borderWidth' || field === 'borderColor' || field === 'opacity' || field === 'fit') {
      const shape = field === 'shape' ? val : imgPopover.shape;
      const border = field === 'border' ? val : imgPopover.border;
      const borderWidth = field === 'borderWidth' ? val : imgPopover.borderWidth;
      const borderColor = field === 'borderColor' ? val : imgPopover.borderColor;
      const opacity = field === 'opacity' ? val : imgPopover.opacity;
      const fit = field === 'fit' ? val : imgPopover.fit;
      const radius = shape === 'square' ? '0' : shape === 'pill' ? '50%' : '10px';
      const bStyle = border === 'none' ? 'none' : border;
      const bWidth = border === 'none' ? '0' : `${borderWidth}px`;
      const pad = fit === 'border' ? '6px' : '0';
      const objFit = fit === 'contain' ? 'contain' : 'cover';
      Array.from(grid.children).forEach((cell) => {
        cell.style.borderRadius = radius;
        cell.style.border = `${bWidth} ${bStyle} ${borderColor}`;
        cell.style.opacity = opacity;
        cell.style.padding = pad;
        const img = cell.querySelector('img');
        if (img) img.style.objectFit = objFit;
      });
    }
    setImgPopover({ ...imgPopover, [field]: val });
    handleInput();
  };

  const deleteElement = () => {
    if (!imgPopover || !imgPopover.el) return;
    imgPopover.el.remove();
    setImgPopover(null);
    handleInput();
  };

  return (
    <div className="rte-wrap">
      <div className="rte-toolbar">
        {TOOLBAR_GROUPS.map((group, gi) => (
          <div key={gi} className="rte-toolbar-group">
            {group.map((item) => (
              <button
                key={item.cmd + (item.val || '')}
                type="button"
                className={`rte-btn${isActive(item) ? ' active' : ''}`}
                onClick={() => handleToolbar(item)}
                title={item.title}
                aria-label={item.label}
                style={item.style}
              >
                {item.icon}
              </button>
            ))}
          </div>
        ))}
      </div>
      <div
        ref={editorRef}
        className="rte-editor"
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={handleInput}
        onMouseUp={syncActive}
        onKeyUp={syncActive}
        onClick={handleEditorClick}
        data-placeholder={placeholder}
      />
      {imgPopover && (
        <div
          className="rte-popover"
          style={{ left: imgPopover.x, top: imgPopover.y }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {imgPopover.type === 'image' ? (
            <>
              <div className="rte-pop-row">
                <label>Size
                  <select value={imgPopover.size} onChange={(e) => applyImageStyle('size', e.target.value)}>
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                    <option value="full">Full</option>
                  </select>
                </label>
                <label>Align
                  <select value={imgPopover.align} onChange={(e) => applyImageStyle('align', e.target.value)}>
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </label>
              </div>
              <button className="rte-pop-delete" onClick={deleteElement}>Delete image</button>
            </>
          ) : (
            <>
              <div className="rte-pop-row">
                <label>Columns
                  <input type="number" min="1" max="6" value={imgPopover.cols} onChange={(e) => applyGridStyle('cols', Number(e.target.value))} />
                </label>
                <label>Rows
                  <input type="number" min="1" max="6" value={imgPopover.rows} onChange={(e) => applyGridStyle('rows', Number(e.target.value))} />
                </label>
              </div>
              <div className="rte-pop-row">
                <label>Shape
                  <select value={imgPopover.shape} onChange={(e) => applyGridStyle('shape', e.target.value)}>
                    <option value="rounded">Rounded</option>
                    <option value="square">Square</option>
                    <option value="pill">Pill</option>
                  </select>
                </label>
                <label>Border
                  <select value={imgPopover.border} onChange={(e) => applyGridStyle('border', e.target.value)}>
                    <option value="none">None</option>
                    <option value="solid">Solid</option>
                    <option value="dotted">Dotted</option>
                    <option value="dashed">Dashed</option>
                  </select>
                </label>
              </div>
              <div className="rte-pop-row">
                <label>Border width
                  <input type="number" min="0" max="20" value={imgPopover.borderWidth} onChange={(e) => applyGridStyle('borderWidth', Number(e.target.value))} />
                </label>
                <label>Border color
                  <input type="color" value={imgPopover.borderColor} onChange={(e) => applyGridStyle('borderColor', e.target.value)} />
                </label>
              </div>
              <div className="rte-pop-row">
                <label>Opacity
                  <input type="range" min="0" max="1" step="0.05" value={imgPopover.opacity} onChange={(e) => applyGridStyle('opacity', Number(e.target.value))} />
                </label>
                <label>Image fit
                  <select value={imgPopover.fit} onChange={(e) => applyGridStyle('fit', e.target.value)}>
                    <option value="cover">Cover</option>
                    <option value="contain">Contain</option>
                    <option value="border">Bordered</option>
                  </select>
                </label>
              </div>
              <div className="rte-pop-row">
                <label>Gap (px)
                  <input type="number" min="0" max="60" value={imgPopover.gap} onChange={(e) => applyGridStyle('gap', Number(e.target.value))} />
                </label>
              </div>
              <button className="rte-pop-delete" onClick={deleteElement}>Delete grid</button>
            </>
          )}
        </div>
      )}
      {showImagePicker && (
        <ImagePickerModal
          onInsert={handleImageInsert}
          onPickData={handleImagePickData}
          onClose={() => setShowImagePicker(false)}
        />
      )}
      {showGridModal && (
        <GridModal onInsert={handleGridInsert} onClose={() => setShowGridModal(false)} />
      )}
    </div>
  );
};

const GridModal = ({ onInsert, onClose }) => {
  const [cols, setCols] = useState(2);
  const [rows, setRows] = useState(2);
  const [shape, setShape] = useState('rounded');
  const [border, setBorder] = useState('solid');
  const [borderWidth, setBorderWidth] = useState(2);
  const [borderColor, setBorderColor] = useState('#3a3a4a');
  const [opacity, setOpacity] = useState(1);
  const [fit, setFit] = useState('cover');
  const [gap, setGap] = useState(12);
  const [urls, setUrls] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);

  const slots = Math.max(1, cols * rows);

  const handlePick = ({ url }) => {
    if (editingSlot !== null && url) {
      const next = [...urls];
      next[editingSlot] = url;
      setUrls(next);
    }
    setShowPicker(false);
    setEditingSlot(null);
  };

  const handleInsert = () => {
    const html = buildGridHtml({ cols, rows, urls, shape, border, borderWidth, borderColor, opacity, fit, gap });
    onInsert(html);
    onClose();
  };

  return (
    <div className="adm-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="adm-modal adm-modal-wide">
        <div className="adm-modal-header">
          <h3>Insert Image Grid</h3>
          <button className="adm-modal-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="adm-modal-body">
          <div className="rte-grid-builder">
            <div className="rte-pop-row">
              <label>Columns
                <input type="number" min="1" max="6" value={cols} onChange={(e) => setCols(Math.max(1, Math.min(6, Number(e.target.value))))} />
              </label>
              <label>Rows
                <input type="number" min="1" max="6" value={rows} onChange={(e) => setRows(Math.max(1, Math.min(6, Number(e.target.value))))} />
              </label>
            </div>
            <div className="rte-pop-row">
              <label>Shape
                <select value={shape} onChange={(e) => setShape(e.target.value)}>
                  <option value="rounded">Rounded</option>
                  <option value="square">Square</option>
                  <option value="pill">Pill</option>
                </select>
              </label>
              <label>Border
                <select value={border} onChange={(e) => setBorder(e.target.value)}>
                  <option value="none">None</option>
                  <option value="solid">Solid</option>
                  <option value="dotted">Dotted</option>
                  <option value="dashed">Dashed</option>
                </select>
              </label>
            </div>
            <div className="rte-pop-row">
              <label>Border width
                <input type="number" min="0" max="20" value={borderWidth} onChange={(e) => setBorderWidth(Number(e.target.value))} />
              </label>
              <label>Border color
                <input type="color" value={borderColor} onChange={(e) => setBorderColor(e.target.value)} />
              </label>
            </div>
            <div className="rte-pop-row">
              <label>Opacity
                <input type="range" min="0" max="1" step="0.05" value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} />
              </label>
              <label>Image fit
                <select value={fit} onChange={(e) => setFit(e.target.value)}>
                  <option value="cover">Cover</option>
                  <option value="contain">Contain</option>
                  <option value="border">Bordered</option>
                </select>
              </label>
            </div>
            <div className="rte-pop-row">
              <label>Gap (px)
                <input type="number" min="0" max="60" value={gap} onChange={(e) => setGap(Number(e.target.value))} />
              </label>
            </div>

            <p className="muted small" style={{ margin: '12px 0 6px' }}>Click each cell to pick an image:</p>
            <div className="rte-grid-preview" style={{ gridTemplateColumns: `repeat(${cols},1fr)`, gap: `${gap}px` }}>
              {Array.from({ length: slots }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`rte-grid-slot${urls[i] ? ' filled' : ''}`}
                  onClick={() => { setEditingSlot(i); setShowPicker(true); }}
                  style={{
                    borderRadius: shape === 'square' ? '0' : shape === 'pill' ? '50%' : '10px',
                    border: border === 'none' ? '1px dashed var(--border)' : `${borderWidth}px ${border} ${borderColor}`,
                    opacity,
                  }}
                >
                  {urls[i] ? (
                    <img src={urls[i]} alt="" style={{ objectFit: fit === 'contain' ? 'contain' : 'cover', padding: fit === 'border' ? '6px' : '0' }} />
                  ) : (
                    <span className="muted small">+ Image</span>
                  )}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
              <button className="ghost small-btn" onClick={onClose}>Cancel</button>
              <button className="btn" onClick={handleInsert}>Insert Grid</button>
            </div>
          </div>
        </div>
        {showPicker && (
          <ImagePickerModal onPickData={handlePick} onClose={() => { setShowPicker(false); setEditingSlot(null); }} />
        )}
      </div>
    </div>
  );
};

export default RichTextEditor;


export default RichTextEditor