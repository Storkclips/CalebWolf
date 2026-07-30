import { useRef, useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import ImagePickerModal from './ImagePickerModal';

const exec = (cmd, val = null) => {
  document.execCommand(cmd, false, val);
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
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [activeCmds, setActiveCmds] = useState({});

  useEffect(() => {
    if (editorRef.current && value !== undefined) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value;
      }
    }
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
      onChange(editorRef.current.innerHTML);
    }
    syncActive();
  }, [onChange, syncActive]);

  const handleToolbar = (item) => {
    if (item.isImage) {
      setShowImagePicker(true);
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

  const isActive = (item) => {
    if (activeCmds[item.cmd]) return true;
    if (item.cmd === 'formatBlock' && activeCmds.block) {
      const tag = activeCmds.block.toLowerCase().replace(/[<>]/g, '');
      const val = item.val.toLowerCase().replace(/[<>]/g, '');
      return tag === val;
    }
    return false;
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
        data-placeholder={placeholder}
      />
      {showImagePicker && (
        <ImagePickerModal
          onInsert={handleImageInsert}
          onClose={() => setShowImagePicker(false)}
        />
      )}
    </div>
  );
};

export default RichTextEditor;
