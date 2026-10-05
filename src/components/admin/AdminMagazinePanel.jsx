import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MagazineBillingPanel from './MagazineBillingPanel';
import MagazineFlipbook from '../magazines/MagazineFlipbook';
import {
  publishMagazinePages,
  pruneOldPublishedPages,
} from '../magazines/publishMagazine';
import { supabase, proxyImageUrl } from '../../lib/supabase';


const blankMagazine = {
  title: 'Untitled Magazine',
  slug: '',
  description: '',
  cover_url: '',
  status: 'draft',
  digital_price: 0,
  physical_price: 0,
  subscription_price: 0,
  page_count: 12,
};


const newElement = (type) => {
  if (type === 'image') {
    return {
      id: crypto.randomUUID(),
      type,
      src: '',
      alt: '',
      x: 10,
      y: 10,
      w: 80,
      h: 45,
      fit: 'cover',
    };
  }

  if (type === 'shape') {
    return {
      id: crypto.randomUUID(),
      type,
      x: 12,
      y: 12,
      w: 76,
      h: 12,
      fill: '#e7c978',
      radius: 0,
    };
  }

  return {
    id: crypto.randomUUID(),
    type: 'text',
    text: 'New headline',
    html: '',
    css: '',
    x: 12,
    y: 12,
    w: 76,
    h: 12,
    fontFamily: 'Georgia, serif',

    /*
     * This value is now treated as a design-scale
     * value instead of a fixed browser pixel size.
     *
     * 28 becomes 2.8cqw.
     */
    fontSize: 28,

    color: '#111111',
    align: 'left',
    weight: 700,
  };
};


const defaultPage = (pageNumber) => ({
  page_number: pageNumber,

  page_kind:
    pageNumber === 1 || pageNumber === 2
      ? 'cover'
      : pageNumber === 3 || pageNumber === 4
        ? 'inside-cover'
        : 'inner',

  background_color: '#ffffff',
  elements: [],
});


const inlineCss = (value = '') =>
  value.split(';').reduce((styles, declaration) => {
    const [property, ...parts] = declaration.split(':');

    if (!property || !parts.length) {
      return styles;
    }

    const key = property
      .trim()
      .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

    return {
      ...styles,
      [key]: parts.join(':').trim(),
    };
  }, {});


export default function AdminMagazinePanel() {
  const navigate = useNavigate();
  const [magazines, setMagazines] = useState([]);
  const [magazine, setMagazine] = useState(null);
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(0);

  const [images, setImages] = useState([]);
  const [imageSearch, setImageSearch] = useState('');

  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'unsaved' | 'saving' | 'autosaving' | 'failed'
  const autosaveTimer = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const [pageView, setPageView] = useState('single');
  const [previewMode, setPreviewMode] = useState(false);

  const [selectedElementId, setSelectedElementId] =
    useState(null);

  const [snapMode, setSnapMode] = useState('grid');
  const [gridSize, setGridSize] = useState(5);


  const page = pages[selectedPage] || null;


  const selectedElement =
    page?.elements.find(
      (item) => item.id === selectedElementId
    ) || null;


  const displayedPages =
    pageView === 'double'
      ? pages.slice(selectedPage, selectedPage + 2)
      : [page].filter(Boolean);


  const visibleImages = useMemo(
    () =>
      images.filter((image) =>
        image.title
          .toLowerCase()
          .includes(imageSearch.toLowerCase())
      ),
    [images, imageSearch]
  );


  // ─── Autosave ───────────────────────────────────────────────────────────────
  const runAutosave = useCallback(async (magazineId, currentPages) => {
    if (!magazineId) return;
    setSaveStatus('autosaving');
    const { error } = await supabase
      .from('magazines')
      .update({
        autosave_json: currentPages,
        autosaved_at: new Date().toISOString(),
      })
      .eq('id', magazineId);
    if (!isMountedRef.current) return;
    setSaveStatus(error ? 'failed' : 'saved');
  }, []);

  useEffect(() => {
    if (!magazine?.id) return;
    setSaveStatus('unsaved');
    clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      runAutosave(magazine.id, pages);
    }, 800);
    return () => clearTimeout(autosaveTimer.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, magazine?.id]);

  // ─── Ctrl+S ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (magazine) saveMagazine(magazine.status);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [magazine, pages]);

  useEffect(() => {
    loadMagazines();

    supabase
      .from('gallery_images')
      .select('id,title,url')
      .eq('is_published', true)
      .order('created_at', {
        ascending: false,
      })
      .limit(80)
      .then(({ data }) => {
        setImages(data || []);
      });
  }, []);


  async function loadMagazines() {
    const { data } = await supabase
      .from('magazines')
      .select('*')
      .order('updated_at', {
        ascending: false,
      });

    setMagazines(data || []);
  }


  async function openMagazine(item) {
    setMagazine(item);

    const { data } = await supabase
      .from('magazine_pages')
      .select('*')
      .eq('magazine_id', item.id)
      .order('page_number');

    const loaded = data || [];

    setPages(
      loaded.length
        ? loaded
        : Array.from(
            { length: item.page_count },
            (_, index) => defaultPage(index + 1)
          )
    );

    setSelectedPage(0);
    setSelectedElementId(null);
    setNotice('');
  }


  async function sliceAndUploadPages(magazineRow, pagesToPublish) {
    const uploaded = await publishMagazinePages(
      magazineRow,
      pagesToPublish,
      magazineRow.project_json?.settings,
      setPublishProgress,
    );
    await pruneOldPublishedPages(magazineRow.id, uploaded.length);
    return uploaded;
  }


  async function publishPages() {
    if (!magazine?.id || publishing) return;
    setPublishing(true);
    setPublishProgress({ done: 0, total: pages.length, step: 'Rendering pages' });
    setNotice('');
    try {
      const uploaded = await sliceAndUploadPages(magazine, pages);
      const publishedCount = uploaded.length;
      setNotice(`Published ${publishedCount} reader pages (00 to ${String(publishedCount - 1).padStart(2, '0')}).`);
    } catch (err) {
      setNotice(`Could not publish pages: ${err.message}`);
    } finally {
      setPublishing(false);
      setPublishProgress(null);
    }
  }

  function startNew() {
    setMagazine({
      ...blankMagazine,
      id: null,
    });

    setPages(
      Array.from(
        { length: blankMagazine.page_count },
        (_, index) => defaultPage(index + 1)
      )
    );

    setSelectedPage(0);
    setSelectedElementId(null);
    setNotice('');
  }


  async function saveMagazine(
    nextStatus = magazine.status
  ) {
    if (!magazine?.title.trim()) {
      return;
    }

    setSaving(true);

    const payload = {
      title: magazine.title.trim(),

      slug:
        magazine.slug.trim() ||
        magazine.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, ''),

      description: magazine.description,

      cover_url: magazine.cover_url,

      status: nextStatus,

      digital_price:
        Number(magazine.digital_price) || 0,

      physical_price:
        Number(magazine.physical_price) || 0,

      subscription_price:
        Number(magazine.subscription_price) || 0,

      page_count: pages.length,

      published_at:
        nextStatus === 'published'
          ? new Date().toISOString()
          : magazine.published_at,

      updated_at: new Date().toISOString(),
    };


    const result = magazine.id
      ? await supabase
          .from('magazines')
          .update(payload)
          .eq('id', magazine.id)
          .select()
          .maybeSingle()
      : await supabase
          .from('magazines')
          .insert(payload)
          .select()
          .maybeSingle();


    if (result.error || !result.data) {
      setNotice('Could not save this magazine.');
      setSaving(false);
      return;
    }


    let saved = result.data;


    if (magazine.id) {
      await supabase
        .from('magazine_pages')
        .delete()
        .eq('magazine_id', saved.id);
    }

    const { error: pagesError } = await supabase
      .from('magazine_pages')
      .insert(
        pages.map((item) => ({
          magazine_id: saved.id,
          page_number: item.page_number,
          page_kind: item.page_kind || 'inner',
          background_color: item.background_color || '#ffffff',
          elements: item.elements || [],
        }))
      );


    setMagazine(saved);

    let statusMsg = nextStatus === 'published' ? 'Magazine published.' : 'Draft saved.';

    if (pagesError) {
      statusMsg += ' Page edits could not be saved.';
    } else if (nextStatus === 'published') {
      setPublishing(true);
      setPublishProgress({ done: 0, total: pages.length, step: 'Rendering pages' });
      try {
        const uploaded = await sliceAndUploadPages(saved, pages);
        const publishedCount = uploaded.length;
        statusMsg = `Magazine published — ${publishedCount} page images created.`;
      } catch (err) {
        statusMsg = `Magazine published, but page images failed: ${err.message}`;
      } finally {
        setPublishing(false);
        setPublishProgress(null);
      }
    }

    setNotice(statusMsg);
    setSaveStatus('saved');

    await loadMagazines();

    setSaving(false);
    return saved;
  }


  async function viewOnSite() {
    const saved = magazine?.id
      ? magazine
      : await saveMagazine('draft');
    if (!saved?.slug) {
      setNotice('Save the magazine with a title first so it gets a web address.');
      return;
    }
    navigate(`/magazines/${saved.slug}`);
  }


  function updatePage(changes) {
    setPages((current) =>
      current.map((item, index) =>
        index === selectedPage
          ? {
              ...item,
              ...changes,
            }
          : item
      )
    );
  }


  function addElement(type) {
    const highestLayer = Math.max(
      0,
      ...(page?.elements || []).map(
        (item) => item.zIndex || 0
      )
    );

    const item = {
      ...newElement(type),
      zIndex: highestLayer + 1,
    };

    updatePage({
      elements: [
        ...(page?.elements || []),
        item,
      ],
    });

    setSelectedElementId(item.id);
  }


  function changeLayer(id, direction) {
    const highestLayer = Math.max(
      0,
      ...(page?.elements || []).map(
        (item) => item.zIndex || 0
      )
    );


    const currentLayer =
      page?.elements.find(
        (item) => item.id === id
      )?.zIndex || 0;


    updateElement(id, {
      zIndex:
        direction === 'front'
          ? highestLayer + 1
          : Math.max(
              0,
              currentLayer + direction
            ),
    });
  }


  function fillImageAcrossSpread(element) {
    if (selectedPage >= pages.length - 1) {
      return;
    }


    const spreadGroup = crypto.randomUUID();


    const leftImage = {
      ...element,

      x: 0,
      y: 0,
      w: 100,
      h: 100,

      fit: 'cover',

      spreadGroup,
      spreadSide: 'left',
    };


    const rightImage = {
      ...leftImage,

      id: crypto.randomUUID(),

      spreadSide: 'right',
    };


    setPages((current) =>
      current.map((item, index) => {
        if (index === selectedPage) {
          return {
            ...item,

            elements: item.elements.map(
              (candidate) =>
                candidate.id === element.id
                  ? leftImage
                  : candidate
            ),
          };
        }


        if (index === selectedPage + 1) {
          return {
            ...item,

            elements: [
              ...item.elements,
              rightImage,
            ],
          };
        }


        return item;
      })
    );
  }


  function updateElement(id, changes) {
    if (!page) {
      return;
    }

    updatePage({
      elements: page.elements.map((item) =>
        item.id === id
          ? {
              ...item,
              ...changes,
            }
          : item
      ),
    });
  }


  function updateElementAt(
    pageIndex,
    id,
    changes
  ) {
    setPages((current) =>
      current.map((item, index) =>
        index === pageIndex
          ? {
              ...item,

              elements: item.elements.map(
                (element) =>
                  element.id === id
                    ? {
                        ...element,
                        ...changes,
                      }
                    : element
              ),
            }
          : item
      )
    );
  }


  function removeElement(id) {
    if (!page) {
      return;
    }

    updatePage({
      elements: page.elements.filter(
        (item) => item.id !== id
      ),
    });

    if (selectedElementId === id) {
      setSelectedElementId(null);
    }
  }


  function snapPosition(
    value,
    candidates
  ) {
    if (snapMode === 'none') {
      return value;
    }


    const gridValue =
      Math.round(value / gridSize) *
      gridSize;


    if (snapMode === 'grid') {
      return gridValue;
    }


    const nearby = candidates.find(
      (candidate) =>
        Math.abs(candidate - value) <= 1.5
    );


    return nearby ?? value;
  }


  function moveElement(
    event,
    element,
    sourcePageIndex
  ) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);

    setSelectedElementId(element.id);


    let activePageIndex =
      sourcePageIndex;


    let activeElement = {
      ...element,
    };


    const stage = event.currentTarget.closest('.magazine-canvas-stage');
    if (!stage) return;


    const startCanvas =
      event.currentTarget.parentElement;


    const startRect =
      startCanvas.getBoundingClientRect();


    const startX = event.clientX;
    const startY = event.clientY;


    const start = {
      x: element.x,
      y: element.y,
    };


    const otherElements =
      pages[
        activePageIndex
      ].elements.filter(
        (item) =>
          item.id !== element.id
      );


    const xCandidates =
      otherElements.flatMap(
        (item) => [
          item.x,
          item.x + item.w,
          item.x + item.w / 2,
        ]
      );


    const yCandidates =
      otherElements.flatMap(
        (item) => [
          item.y,
          item.y + item.h,
          item.y + item.h / 2,
        ]
      );


    const move = (moveEvent) => {
      const canvases = [
        ...stage.querySelectorAll(
          '.magazine-canvas'
        ),
      ];


      const targetCanvas =
        canvases.find((candidate) => {
          const rect =
            candidate.getBoundingClientRect();

          return (
            moveEvent.clientX >=
              rect.left &&
            moveEvent.clientX <=
              rect.right &&
            moveEvent.clientY >=
              rect.top &&
            moveEvent.clientY <=
              rect.bottom
          );
        }) || startCanvas;


      const targetPageIndex =
        Number(
          targetCanvas.dataset.pageIndex
        );


      const targetRect =
        targetCanvas.getBoundingClientRect();


      const baseX =
        targetPageIndex ===
        activePageIndex
          ? start.x +
            ((moveEvent.clientX -
              startX) /
              startRect.width) *
              100
          : ((moveEvent.clientX -
              targetRect.left) /
              targetRect.width) *
              100 -
            activeElement.w / 2;


      const baseY =
        targetPageIndex ===
        activePageIndex
          ? start.y +
            ((moveEvent.clientY -
              startY) /
              startRect.height) *
              100
          : ((moveEvent.clientY -
              targetRect.top) /
              targetRect.height) *
              100 -
            activeElement.h / 2;


      const nextPosition = {
        x: Math.max(
          0,
          Math.min(
            100 - activeElement.w,

            snapPosition(
              baseX,
              xCandidates
            )
          )
        ),

        y: Math.max(
          0,
          Math.min(
            100 - activeElement.h,

            snapPosition(
              baseY,
              yCandidates
            )
          )
        ),
      };


      if (
        targetPageIndex !==
        activePageIndex
      ) {
        setPages((current) =>
          current.map(
            (item, index) => {
              if (
                index ===
                activePageIndex
              ) {
                return {
                  ...item,

                  elements:
                    item.elements.filter(
                      (candidate) =>
                        candidate.id !==
                        activeElement.id
                    ),
                };
              }


              if (
                index ===
                targetPageIndex
              ) {
                return {
                  ...item,

                  elements: [
                    ...item.elements,

                    {
                      ...activeElement,
                      ...nextPosition,
                    },
                  ],
                };
              }


              return item;
            }
          )
        );


        activePageIndex =
          targetPageIndex;


        activeElement = {
          ...activeElement,
          ...nextPosition,
        };
      } else {
        activeElement = {
          ...activeElement,
          ...nextPosition,
        };


        updateElementAt(
          activePageIndex,
          activeElement.id,
          nextPosition
        );
      }
    };


    const stop = () => {
      window.removeEventListener(
        'pointermove',
        move
      );

      window.removeEventListener(
        'pointerup',
        stop
      );
    };


    window.addEventListener(
      'pointermove',
      move
    );

    window.addEventListener(
      'pointerup',
      stop
    );
  }


  function runRichTextCommand(
    command,
    value
  ) {
    document.execCommand(
      command,
      false,
      value
    );


    const editor =
      document.querySelector(
        `[data-magazine-editing="${selectedElementId}"]`
      );


    if (editor) {
      updateElement(
        selectedElementId,
        {
          html: editor.innerHTML,
          text: editor.textContent,
        }
      );
    }
  }


  const pageLabel = (canvasPage) => {
    if (canvasPage.page_number === 1) {
      return 'Outside cover · back cover + spine';
    }

    if (canvasPage.page_number === 2) {
      return 'Outside cover · front cover + spine';
    }

    if (canvasPage.page_number === 3) {
      return 'Inside cover · front';
    }

    if (canvasPage.page_number === 4) {
      return 'Inside cover · back';
    }

    return `Inner page ${canvasPage.page_number}`;
  };


  const renderCanvasPage = (
    canvasPage,
    readOnly = false,
    canvasPageIndex = selectedPage
  ) => (
    <div
      className={
        `magazine-canvas${
          readOnly
            ? ' magazine-canvas--readonly'
            : ''
        }`
      }

      data-page-index={
        canvasPageIndex
      }

      style={{
        background:
          canvasPage.background_color,
      }}
    >
      <div
        className="magazine-template-guides"
        aria-hidden="true"
      >
        <span className="guide-bleed" />
        <span className="guide-trim" />
        <span className="guide-safe" />
        <span className="guide-binding" />
      </div>


      {canvasPage.elements.map(
        (element) => {
          /*
           * The old version used:
           *
           * fontSize: `${element.fontSize}px`
           *
           * which meant text stayed the same
           * pixel size when the page shrank.
           *
           * Now it scales with the magazine
           * page itself using container units.
           */
          const responsiveFontSize =
            element.type === 'text'
              ? `${element.fontSize / 10}cqw`
              : undefined;


          const responsiveRadius =
            element.radius
              ? `${element.radius / 10}cqw`
              : 0;


          return (
            <div
              key={element.id}

              data-magazine-element={
                element.id
              }

              className={
                `magazine-element ` +
                `magazine-element--${element.type}` +
                `${
                  element.spreadSide
                    ? ` spread-${element.spreadSide}`
                    : ''
                }` +
                `${
                  selectedElementId ===
                  element.id
                    ? ' selected'
                    : ''
                }`
              }

              onPointerDown={(event) => {
                if (!readOnly) {
                  moveElement(
                    event,
                    element,
                    canvasPageIndex
                  );
                }
              }}

              onClick={() => {
                if (!readOnly) {
                  setSelectedElementId(
                    element.id
                  );
                }
              }}

              style={{
                left: `${element.x}%`,
                top: `${element.y}%`,

                width: `${element.w}%`,
                height: `${element.h}%`,

                color: element.color,

                background:
                  element.type ===
                  'shape'
                    ? element.fill
                    : undefined,

                fontFamily:
                  element.fontFamily,

                fontSize:
                  responsiveFontSize,

                fontWeight:
                  element.weight,

                textAlign:
                  element.align,

                borderRadius:
                  responsiveRadius,

                zIndex:
                  element.zIndex || 1,

                ...inlineCss(
                  element.css
                ),
              }}
            >
              {element.type ===
                'image' &&
                element.src && (
                  <img
                    src={proxyImageUrl(
                      element.src,
                      1200
                    )}

                    alt={
                      element.alt
                    }

                    style={{
                      objectFit:
                        element.fit,
                    }}
                  />
                )}


              {element.type ===
                'text' && (
                  <span
                    data-magazine-editing={
                      !readOnly &&
                      selectedElementId ===
                        element.id
                        ? element.id
                        : undefined
                    }

                    contentEditable={
                      !readOnly
                    }

                    suppressContentEditableWarning

                    onPointerDown={(
                      event
                    ) => {
                      event.stopPropagation();
                    }}

                    onBlur={(event) => {
                      updateElementAt(
                        canvasPageIndex,
                        element.id,
                        {
                          html:
                            event
                              .currentTarget
                              .innerHTML,

                          text:
                            event
                              .currentTarget
                              .textContent,
                        }
                      );
                    }}

                    dangerouslySetInnerHTML={{
                      __html:
                        element.html ||
                        element.text,
                    }}
                  />
                )}


              {!readOnly && (
                <button
                  type="button"
                  className="magazine-element-remove"

                  onPointerDown={(
                    event
                  ) => {
                    event.stopPropagation();
                  }}

                  onClick={() =>
                    removeElement(
                      element.id
                    )
                  }

                  aria-label="Remove element"
                >
                  ×
                </button>
              )}
            </div>
          );
        }
      )}
    </div>
  );


  if (!magazine) {
    return (
      <section className="section magazine-admin-shell">
        <div className="section-head">
          <div>
            <p className="eyebrow">
              Publishing
            </p>

            <h2>
              Magazine studio
            </h2>

            <p className="muted">
              Build, preview, and
              release digital editions
              from the perfect-bound
              8.5 × 11 template.
            </p>
          </div>

          <button
            className="btn"
            type="button"
            onClick={startNew}
          >
            New magazine
          </button>
        </div>


        <div className="magazine-list">
          {magazines.map(
            (item) => (
              <button
                type="button"

                className="magazine-list-item"

                key={item.id}

                onClick={() =>
                  openMagazine(item)
                }
              >
                <span>
                  <strong>
                    {item.title}
                  </strong>

                  <small>
                    {item.page_count}{' '}
                    pages · $
                    {Number(
                      item.digital_price
                    ).toFixed(2)}{' '}
                    digital
                  </small>
                </span>

                <em
                  className={
                    `magazine-status ` +
                    `magazine-status--${item.status}`
                  }
                >
                  {item.status}
                </em>
              </button>
            )
          )}
        </div>


        {!magazines.length && (
          <div className="home-empty-state">
            No magazines yet. Start
            your first edition.
          </div>
        )}

        <MagazineBillingPanel />
      </section>
    );
  }


  return (
    <section className="section magazine-admin-shell">
      <div className="magazine-studio-header">
        <div>
          <button
            type="button"
            className="ghost"

            onClick={() => {
              setMagazine(null);
              setSelectedElementId(null);
            }}
          >
            ← All magazines
          </button>

          <p className="eyebrow">
            Magazine studio
          </p>

          <h2>
            {magazine.title}
          </h2>
        </div>


        <div className="magazine-studio-actions">
          <button
            className="ghost"
            type="button"

            disabled={saving}

            onClick={() =>
              saveMagazine('draft')
            }
          >
            Save draft
          </button>


          <button
            className="ghost"
            type="button"
            disabled={saving || !magazine?.title?.trim()}
            onClick={viewOnSite}
          >
            View on site
          </button>

          <button
            className="btn"
            type="button"

            disabled={saving}

            onClick={() =>
              saveMagazine(
                magazine.status ===
                  'published'
                  ? 'hidden'
                  : 'published'
              )
            }
          >
            {magazine.status ===
            'published'
              ? 'Hide magazine'
              : 'Publish magazine'}
          </button>

          <button
            className="btn btn--outline"
            type="button"
            disabled={publishing || !magazine?.id}
            onClick={publishPages}
          >
            {publishing
              ? `Slicing pages\u2026 ${publishProgress ? `${publishProgress.done}/${publishProgress.total}` : ''}`
              : 'Slice & publish page images'}
          </button>
        </div>
      </div>


      {notice && (
        <div
          className="notice"
          role="status"
        >
          {notice}
        </div>
      )}


      <div className="magazine-settings-grid">
        <label className="ap-label">
          Title

          <input
            className="ap-input"

            value={magazine.title}

            onChange={(event) =>
              setMagazine({
                ...magazine,
                title:
                  event.target.value,
              })
            }
          />
        </label>


        <label className="ap-label">
          Slug

          <input
            className="ap-input"

            value={magazine.slug}

            onChange={(event) =>
              setMagazine({
                ...magazine,
                slug:
                  event.target.value,
              })
            }
          />
        </label>


        <label className="ap-label">
          Digital price

          <input
            className="ap-input"
            type="number"

            min="0"
            step="0.01"

            value={
              magazine.digital_price
            }

            onChange={(event) =>
              setMagazine({
                ...magazine,

                digital_price:
                  event.target.value,
              })
            }
          />
        </label>


        <label className="ap-label">
          Physical price

          <input
            className="ap-input"
            type="number"

            min="0"
            step="0.01"

            value={
              magazine.physical_price
            }

            onChange={(event) =>
              setMagazine({
                ...magazine,

                physical_price:
                  event.target.value,
              })
            }
          />
        </label>


        <label className="ap-label magazine-settings-wide">
          Description

          <textarea
            className="ap-textarea"

            value={
              magazine.description
            }

            onChange={(event) =>
              setMagazine({
                ...magazine,

                description:
                  event.target.value,
              })
            }
          />
        </label>
      </div>


      <div className="magazine-editor-layout">
        <aside className="magazine-page-strip">
          {pages.map(
            (item, index) => (
              <button
                type="button"

                key={
                  item.page_number
                }

                className={
                  `magazine-page-thumb${
                    index ===
                    selectedPage
                      ? ' active'
                      : ''
                  }`
                }

                onClick={() => {
                  setSelectedPage(
                    index
                  );

                  setSelectedElementId(
                    null
                  );
                }}
              >
                <span>
                  {item.page_number}
                </span>

                <div
                  style={{
                    background:
                      item.background_color,
                  }}
                />
              </button>
            )
          )}
        </aside>


        <div className="magazine-workspace">
          <div className="magazine-toolbar">
            <span className="magazine-save-status">
              {(saveStatus === 'autosaving' || saveStatus === 'saving') && 'Saving\u2026'}
              {saveStatus === 'saved' && 'Saved'}
              {saveStatus === 'unsaved' && 'Unsaved changes'}
              {saveStatus === 'failed' && 'Save failed \u2014 Retry'}
            </span>

            <button
              type="button"
              onClick={() =>
                addElement('text')
              }
            >
              Text
            </button>


            <button
              type="button"
              onClick={() =>
                addElement('image')
              }
            >
              Image
            </button>


            <button
              type="button"
              onClick={() =>
                addElement('shape')
              }
            >
              Shape
            </button>


            <button
              type="button"

              className={
                previewMode
                  ? 'active'
                  : ''
              }

              onClick={() =>
                setPreviewMode(
                  !previewMode
                )
              }
            >
              {previewMode
                ? '← Back to editing'
                : 'Preview flipbook'}
            </button>


            <button
              type="button"

              className={
                pageView === 'single'
                  ? 'active'
                  : ''
              }

              onClick={() =>
                setPageView(
                  'single'
                )
              }
            >
              Single page
            </button>


            <button
              type="button"

              className={
                pageView === 'double'
                  ? 'active'
                  : ''
              }

              onClick={() =>
                setPageView(
                  'double'
                )
              }
            >
              Double page
            </button>


            <button
              type="button"

              onClick={() => {
                setSelectedPage(
                  (current) =>
                    Math.min(
                      pages.length - 1,

                      current +
                        (pageView ===
                        'double'
                          ? 2
                          : 1)
                    )
                );

                setSelectedElementId(
                  null
                );
              }}

              disabled={
                selectedPage >=
                pages.length -
                  (pageView ===
                  'double'
                    ? 2
                    : 1)
              }
            >
              Next page →
            </button>


            <button
              type="button"

              className={
                snapMode === 'grid'
                  ? 'active'
                  : ''
              }

              onClick={() =>
                setSnapMode(
                  snapMode === 'grid'
                    ? 'none'
                    : 'grid'
                )
              }
            >
              Grid snap
            </button>


            <button
              type="button"

              className={
                snapMode ===
                'objects'
                  ? 'active'
                  : ''
              }

              onClick={() =>
                setSnapMode(
                  snapMode ===
                    'objects'
                    ? 'none'
                    : 'objects'
                )
              }
            >
              Object snap
            </button>


            <label className="magazine-grid-size">
              Grid

              <select
                value={gridSize}

                onChange={(event) =>
                  setGridSize(
                    Number(
                      event.target
                        .value
                    )
                  )
                }
              >
                <option value="2">
                  2%
                </option>

                <option value="5">
                  5%
                </option>

                <option value="10">
                  10%
                </option>
              </select>
            </label>


            <span>
              Page{' '}
              {page?.page_number} ·{' '}
              {page
                ? pageLabel(page)
                : ''}
            </span>
          </div>


          {selectedElement?.type ===
            'text' && (
            <div className="magazine-rich-toolbar">
              <select
                value={
                  selectedElement.fontFamily
                }

                onChange={(event) =>
                  updateElement(
                    selectedElement.id,
                    {
                      fontFamily:
                        event.target
                          .value,
                    }
                  )
                }
              >
                <option value="Arial, sans-serif">
                  Arial
                </option>

                <option value="Georgia, serif">
                  Georgia
                </option>

                <option value="Courier New, monospace">
                  Courier
                </option>

                <option value="Times New Roman, serif">
                  Times
                </option>
              </select>


              <select
                value={
                  selectedElement.fontSize
                }

                onChange={(event) =>
                  updateElement(
                    selectedElement.id,
                    {
                      fontSize:
                        Number(
                          event.target
                            .value
                        ),
                    }
                  )
                }
              >
                <option value="12">
                  12
                </option>

                <option value="16">
                  16
                </option>

                <option value="21">
                  21
                </option>

                <option value="28">
                  28
                </option>

                <option value="42">
                  42
                </option>

                <option value="64">
                  64
                </option>
              </select>


              <button
                type="button"
                onClick={() =>
                  runRichTextCommand(
                    'bold'
                  )
                }
              >
                <strong>B</strong>
              </button>


              <button
                type="button"
                onClick={() =>
                  runRichTextCommand(
                    'italic'
                  )
                }
              >
                <em>I</em>
              </button>


              <button
                type="button"
                onClick={() =>
                  runRichTextCommand(
                    'underline'
                  )
                }
              >
                <u>U</u>
              </button>


              <button
                type="button"
                onClick={() =>
                  runRichTextCommand(
                    'justifyLeft'
                  )
                }
              >
                Align left
              </button>


              <button
                type="button"
                onClick={() =>
                  runRichTextCommand(
                    'justifyCenter'
                  )
                }
              >
                Center
              </button>


              <button
                type="button"
                onClick={() =>
                  runRichTextCommand(
                    'insertUnorderedList'
                  )
                }
              >
                List
              </button>


              <span>
                Rich text editor ·
                HTML/CSS source is
                in the inspector
              </span>
            </div>
          )}


          {previewMode ? (
            <div className="magazine-admin-preview">
              <MagazineFlipbook
                pages={pages}
                title={magazine.title}
                settings={magazine.project_json?.settings}
                magazine={magazine}
              />
            </div>
          ) : (
          <div
            className={
              `magazine-canvas-stage ` +
              `magazine-canvas-stage--${pageView}`
            }
          >
            {displayedPages.map(
              (
                canvasPage,
                index
              ) => (
                <div
                  className="magazine-canvas-slot"

                  key={
                    canvasPage.page_number
                  }
                >
                  {renderCanvasPage(
                    canvasPage,
                    false,
                    selectedPage +
                      index
                  )}

                  <small>
                    {
                      canvasPage.page_number
                    }{' '}
                    ·{' '}
                    {pageLabel(
                      canvasPage
                    )}
                  </small>
                </div>
              )
            )}
          </div>
          )}
        </div>


        <aside className="magazine-inspector">
          <h3>
            Page design
          </h3>


          <label className="ap-label">
            Background

            <input
              className="ap-input"
              type="color"

              value={
                page?.background_color ||
                '#ffffff'
              }

              onChange={(event) =>
                updatePage({
                  background_color:
                    event.target.value,
                })
              }
            />
          </label>


          {page?.elements.map(
            (element) => (
              <div
                className={
                  `magazine-inspector-card${
                    selectedElementId ===
                    element.id
                      ? ' active'
                      : ''
                  }`
                }

                key={element.id}

                onClick={() =>
                  setSelectedElementId(
                    element.id
                  )
                }
              >
                <strong>
                  {element.type}
                </strong>


                <div className="magazine-layer-actions">
                  <button
                    type="button"

                    onClick={() =>
                      changeLayer(
                        element.id,
                        'front'
                      )
                    }
                  >
                    Bring front
                  </button>


                  <button
                    type="button"

                    onClick={() =>
                      changeLayer(
                        element.id,
                        1
                      )
                    }
                  >
                    Up
                  </button>


                  <button
                    type="button"

                    onClick={() =>
                      changeLayer(
                        element.id,
                        -1
                      )
                    }
                  >
                    Down
                  </button>
                </div>


                {element.type ===
                  'text' && (
                  <>
                    <input
                      className="ap-input"

                      value={
                        element.text
                      }

                      onChange={(
                        event
                      ) =>
                        updateElement(
                          element.id,
                          {
                            text:
                              event
                                .target
                                .value,
                          }
                        )
                      }

                      placeholder="Text content"
                    />


                    <textarea
                      className="ap-textarea"

                      value={
                        element.html ||
                        ''
                      }

                      onChange={(
                        event
                      ) =>
                        updateElement(
                          element.id,
                          {
                            html:
                              event
                                .target
                                .value,
                          }
                        )
                      }

                      placeholder="HTML source for this text block"
                    />


                    <input
                      className="ap-input"

                      value={
                        element.css ||
                        ''
                      }

                      onChange={(
                        event
                      ) =>
                        updateElement(
                          element.id,
                          {
                            css:
                              event
                                .target
                                .value,
                          }
                        )
                      }

                      placeholder="Optional CSS: letter-spacing: .08em;"
                    />


                    <select
                      className="ap-input"

                      value={
                        element.align
                      }

                      onChange={(
                        event
                      ) =>
                        updateElement(
                          element.id,
                          {
                            align:
                              event
                                .target
                                .value,
                          }
                        )
                      }
                    >
                      <option value="left">
                        Left
                      </option>

                      <option value="center">
                        Center
                      </option>

                      <option value="right">
                        Right
                      </option>
                    </select>
                  </>
                )}


                {element.type ===
                  'image' && (
                  <>
                    <input
                      className="ap-input"

                      placeholder="Paste image URL or choose below"

                      value={
                        element.src
                      }

                      onChange={(
                        event
                      ) =>
                        updateElement(
                          element.id,
                          {
                            src:
                              event
                                .target
                                .value,
                          }
                        )
                      }
                    />


                    <input
                      className="ap-input"

                      placeholder="Alt text"

                      value={
                        element.alt
                      }

                      onChange={(
                        event
                      ) =>
                        updateElement(
                          element.id,
                          {
                            alt:
                              event
                                .target
                                .value,
                          }
                        )
                      }
                    />


                    <button
                      type="button"

                      className="magazine-fit-button"

                      onClick={() =>
                        updateElement(
                          element.id,
                          {
                            x: 0,
                            y: 0,
                            w: 100,
                            h: 100,
                            fit:
                              'cover',
                          }
                        )
                      }
                    >
                      Fill single page /
                      auto crop
                    </button>


                    <button
                      type="button"

                      className="magazine-fit-button"

                      onClick={() =>
                        fillImageAcrossSpread(
                          element
                        )
                      }

                      disabled={
                        selectedPage >=
                        pages.length - 1
                      }
                    >
                      Fill double page
                    </button>
                  </>
                )}


                {element.type ===
                  'shape' && (
                  <input
                    className="ap-input"

                    type="color"

                    value={
                      element.fill
                    }

                    onChange={(
                      event
                    ) =>
                      updateElement(
                        element.id,
                        {
                          fill:
                            event
                              .target
                              .value,
                        }
                      )
                    }
                  />
                )}


                <div className="magazine-size-row">
                  <label>
                    X

                    <input
                      className="ap-input"

                      type="number"

                      min="0"
                      max="100"

                      value={Math.round(
                        element.x
                      )}

                      onChange={(
                        event
                      ) =>
                        updateElement(
                          element.id,
                          {
                            x:
                              Number(
                                event
                                  .target
                                  .value
                              ),
                          }
                        )
                      }
                    />
                  </label>


                  <label>
                    Y

                    <input
                      className="ap-input"

                      type="number"

                      min="0"
                      max="100"

                      value={Math.round(
                        element.y
                      )}

                      onChange={(
                        event
                      ) =>
                        updateElement(
                          element.id,
                          {
                            y:
                              Number(
                                event
                                  .target
                                  .value
                              ),
                          }
                        )
                      }
                    />
                  </label>


                  <label>
                    W

                    <input
                      className="ap-input"

                      type="number"

                      min="1"
                      max="100"

                      value={Math.round(
                        element.w
                      )}

                      onChange={(
                        event
                      ) =>
                        updateElement(
                          element.id,
                          {
                            w:
                              Number(
                                event
                                  .target
                                  .value
                              ),
                          }
                        )
                      }
                    />
                  </label>


                  <label>
                    H

                    <input
                      className="ap-input"

                      type="number"

                      min="1"
                      max="100"

                      value={Math.round(
                        element.h
                      )}

                      onChange={(
                        event
                      ) =>
                        updateElement(
                          element.id,
                          {
                            h:
                              Number(
                                event
                                  .target
                                  .value
                              ),
                          }
                        )
                      }
                    />
                  </label>
                </div>
              </div>
            )
          )}


          <h3>
            Image library
          </h3>


          <input
            className="ap-input"

            placeholder="Search images"

            value={imageSearch}

            onChange={(event) =>
              setImageSearch(
                event.target.value
              )
            }
          />


          <div className="magazine-image-library">
            {visibleImages
              .slice(0, 12)
              .map((image) => (
                <button
                  type="button"

                  key={image.id}

                  onClick={() => {
                    const target =
                      page?.elements.find(
                        (item) =>
                          item.type ===
                            'image' &&
                          !item.src
                      );


                    if (target) {
                      updateElement(
                        target.id,
                        {
                          src:
                            image.url,

                          alt:
                            image.title,
                        }
                      );

                      setSelectedElementId(
                        target.id
                      );

                      return;
                    }


                    const item =
                      newElement(
                        'image'
                      );


                    const highestLayer =
                      Math.max(
                        0,

                        ...(
                          page
                            ?.elements ||
                          []
                        ).map(
                          (candidate) =>
                            candidate.zIndex ||
                            0
                        )
                      );


                    const newImage = {
                      ...item,

                      src:
                        image.url,

                      alt:
                        image.title,

                      zIndex:
                        highestLayer +
                        1,
                    };


                    updatePage({
                      elements: [
                        ...page.elements,

                        newImage,
                      ],
                    });


                    setSelectedElementId(
                      newImage.id
                    );
                  }}
                >
                  <img
                    src={proxyImageUrl(
                      image.url,
                      240
                    )}

                    alt={
                      image.title
                    }
                  />
                </button>
              ))}
          </div>
        </aside>
      </div>
    </section>
  );
}