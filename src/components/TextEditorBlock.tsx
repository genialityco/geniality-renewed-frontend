// @ts-nocheck
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { uploadImageToFirebase } from "../utils/uploadImageToFirebase";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type BlockType =
  | "paragraph"
  | "h1"
  | "h2"
  | "bullet-list"
  | "numbered-list"
  | "image"
  | "video";

export interface EditorBlock {
  id: string;
  type: BlockType;
  content: string;
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const BLOCK_TYPES = [
  { key: "paragraph", label: "Texto", icon: "¶" },
  { key: "h1", label: "Título 1", icon: "H1" },
  { key: "h2", label: "Título 2", icon: "H2" },
  { key: "bullet-list", label: "Lista de viñetas", icon: "•" },
  { key: "numbered-list", label: "Lista enumerada", icon: "1." },
  { key: "image", label: "Imagen", icon: "🖼" },
  { key: "video", label: "Video", icon: "▶" },
] as const;

const newBlock = (
  type: BlockType = "paragraph",
  content = "",
): EditorBlock => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  type,
  content,
});

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function caretAtStart(el: HTMLElement) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  return range.startOffset === 0 && range.endOffset === 0;
}

function caretAtEnd(el: HTMLElement) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  const len = el.innerText?.length ?? 0;
  return range.startOffset === len && range.endOffset === len;
}

function getEmbedUrl(url: string): string | null {
  try {
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
    const vi = url.match(/vimeo\.com\/(\d+)/);
    if (vi) return `https://player.vimeo.com/video/${vi[1]}`;
  } catch {}
  return null;
}

const isFirebaseUrl = (url: string) =>
  url?.startsWith("https://firebasestorage");

function placeholderByType(type: BlockType) {
  switch (type) {
    case "h1":
      return "Título";
    case "h2":
      return "Subtítulo";
    case "bullet-list":
      return "Escribe un elemento…";
    case "numbered-list":
      return "Escribe un elemento…";
    default:
      return "Escribe algo, o '/' para comandos…";
  }
}

function getBlockStyle(type: BlockType) {
  const base = {
    outline: "none",
    minHeight: 28,
    width: "100%",
    color: "#EDEDED",
    whiteSpace: "pre-wrap" as const,
    wordBreak: "break-word" as const,
  };
  if (type === "h1")
    return {
      ...base,
      fontSize: 40,
      fontWeight: 700,
      lineHeight: 1.15,
      margin: 0,
    };
  if (type === "h2")
    return {
      ...base,
      fontSize: 28,
      fontWeight: 650,
      lineHeight: 1.2,
      margin: 0,
    };
  return { ...base, fontSize: 16, lineHeight: 1.6 };
}

// ─────────────────────────────────────────────
// EditableDiv
// ─────────────────────────────────────────────

const EditableDiv = React.forwardRef<HTMLElement, any>(function EditableDiv(
  { tag: Tag = "div", initialContent, style, className, ...rest },
  forwardedRef,
) {
  const innerRef = useRef<HTMLElement>(null);

  const setRef = useCallback(
    (el: HTMLElement | null) => {
      (innerRef as any).current = el;
      if (typeof forwardedRef === "function") forwardedRef(el);
      else if (forwardedRef) (forwardedRef as any).current = el;
    },
    [forwardedRef],
  );

  useEffect(() => {
    if (innerRef.current) {
      innerRef.current.innerText = initialContent ?? "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Tag
      ref={setRef}
      contentEditable
      suppressContentEditableWarning
      style={style}
      className={className}
      {...rest}
    />
  );
});

// ─────────────────────────────────────────────
// UploadingOverlay
// ─────────────────────────────────────────────

function UploadingOverlay() {
  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={uploadOverlayStyle}>
        <div style={spinnerStyle} />
        <span style={{ fontSize: 13, color: "#AFAFAF" }}>
          Subiendo a Firebase…
        </span>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// ImageBlock — FIXED
// ─────────────────────────────────────────────

function ImageBlock({
  block,
  removeBlock,
  updateBlockContent,
  insertBlockAfter,
  refSetter,
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState<string>(() => {
    const c = block.content ?? "";
    return isFirebaseUrl(c) ? "" : c;
  });

  // ✅ FIX: ref para el input file oculto
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const url = await uploadImageToFirebase(file, "quiz_images");
      updateBlockContent(block.id, url);
      setUrlInput("");
      insertBlockAfter(block.id);
    } catch (err: any) {
      setError(
        `Error al subir la imagen (${err?.code ?? "desconocido"}). Intenta de nuevo.`,
      );
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUrlInput(val);
    updateBlockContent(block.id, val);
  };

  const handleUrlKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && urlInput === "" && !block.content) {
      e.preventDefault();
      removeBlock(block.id);
    }
  };

  const handleClear = () => {
    updateBlockContent(block.id, "");
    setUrlInput("");
  };

  const content = block.content ?? "";
  const isFirebase = isFirebaseUrl(content);
  const hasContent = !!content;

  return (
    <div
      ref={refSetter}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Backspace" && !hasContent && !uploading) {
          e.preventDefault();
          removeBlock(block.id);
        }
      }}
      style={{ outline: "none" }}
    >
      <div style={mediaInputRow}>
        {/* Archivo */}
        <div style={mediaColumn}>
          <span style={mediaLabel}>Archivo</span>

          {/* ✅ FIX: button + input hidden con ref en lugar de label+input superpuesto */}
          <button
            type="button"
            style={{
              ...mediaBtn,
              opacity: uploading ? 0.5 : 1,
              cursor: uploading ? "not-allowed" : "pointer",
            }}
            onClick={() => !uploading && fileInputRef.current?.click()}
          >
            {uploading ? "Subiendo…" : "📁 Seleccionar imagen"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            disabled={uploading}
            style={{ display: "none" }}
          />

          {isFirebase && !uploading && (
            <span style={uploadedBadge}>✓ Imagen subida</span>
          )}
        </div>

        {/* URL directa — solo muestra si NO hay archivo Firebase */}
        {!isFirebase && (
          <div style={mediaColumn}>
            <label style={mediaLabel}>URL directa</label>
            <input
              type="text"
              placeholder="https://..."
              value={urlInput}
              onChange={handleUrlChange}
              onKeyDown={handleUrlKeyDown}
              disabled={uploading}
              style={{
                ...mediaInput(),
                opacity: uploading ? 0.5 : 1,
              }}
            />
          </div>
        )}

        {/* Limpiar */}
        {hasContent && !uploading && (
          <button onClick={handleClear} style={clearBtn}>
            Limpiar
          </button>
        )}
      </div>

      {error && <p style={errorText}>{error}</p>}
      {uploading && <UploadingOverlay />}

      {!uploading && hasContent && (
        <div style={mediaPreviewWrap}>
          <img
            src={block.content}
            alt="preview"
            style={{ width: "100%", maxHeight: 320, objectFit: "cover" }}
          />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// VideoBlock — FIXED
// ─────────────────────────────────────────────

function VideoBlock({
  block,
  removeBlock,
  updateBlockContent,
  insertBlockAfter,
  refSetter,
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState<string>(() => {
    const c = block.content ?? "";
    return isFirebaseUrl(c) ? "" : c;
  });

  // ✅ FIX: ref para el input file oculto
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const url = await uploadImageToFirebase(file, "quiz_videos");
      updateBlockContent(block.id, url);
      setUrlInput("");
      insertBlockAfter(block.id);
    } catch (err: any) {
      setError(
        `Error al subir el video (${err?.code ?? "desconocido"}). Intenta de nuevo.`,
      );
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUrlInput(val);
    updateBlockContent(block.id, val);
  };

  const handleUrlKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && urlInput === "" && !block.content) {
      e.preventDefault();
      removeBlock(block.id);
    }
  };

  const handleClear = () => {
    updateBlockContent(block.id, "");
    setUrlInput("");
  };

  const content = block.content ?? "";
  const isFirebase = isFirebaseUrl(content);
  const embedUrl = content && !isFirebase ? getEmbedUrl(content) : null;
  const isInvalid = content && !isFirebase && !embedUrl && !uploading;
  const hasContent = !!content;

  return (
    <div
      ref={refSetter}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Backspace" && !hasContent && !uploading) {
          e.preventDefault();
          removeBlock(block.id);
        }
      }}
      style={{ outline: "none" }}
    >
      <div style={mediaInputRow}>
        {/* Archivo de video */}
        <div style={mediaColumn}>
          <span style={mediaLabel}>Archivo de video</span>

          {/* ✅ FIX: button + input hidden con ref en lugar de label+input superpuesto */}
          <button
            type="button"
            style={{
              ...mediaBtn,
              opacity: uploading ? 0.5 : 1,
              cursor: uploading ? "not-allowed" : "pointer",
            }}
            onClick={() => !uploading && fileInputRef.current?.click()}
          >
            {uploading ? "Subiendo…" : "📁 Seleccionar video"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFile}
            disabled={uploading}
            style={{ display: "none" }}
          />

          {isFirebase && !uploading && (
            <span style={uploadedBadge}>✓ Video subido</span>
          )}
        </div>

        {/* URL YouTube / Vimeo — solo muestra si NO hay archivo Firebase */}
        {!isFirebase && (
          <div style={mediaColumn}>
            <label style={mediaLabel}>URL (YouTube / Vimeo)</label>
            <input
              type="text"
              placeholder="https://youtube.com/watch?v=..."
              value={urlInput}
              onChange={handleUrlChange}
              onKeyDown={handleUrlKeyDown}
              disabled={uploading}
              style={{
                ...mediaInput(!!isInvalid),
                opacity: uploading ? 0.5 : 1,
              }}
            />
          </div>
        )}

        {/* Limpiar */}
        {hasContent && !uploading && (
          <button onClick={handleClear} style={clearBtn}>
            Limpiar
          </button>
        )}
      </div>

      {error && <p style={errorText}>{error}</p>}
      {isInvalid && (
        <p style={errorText}>
          URL no reconocida. Usa YouTube, Vimeo o sube un archivo.
        </p>
      )}
      {uploading && <UploadingOverlay />}

      {/* Firebase → reproductor nativo */}
      {!uploading && isFirebase && (
        <div style={{ ...mediaPreviewWrap, aspectRatio: "16/9" }}>
          <video
            src={content}
            controls
            style={{ width: "100%", height: "100%", borderRadius: 8 }}
          />
        </div>
      )}

      {/* YouTube / Vimeo → iframe */}
      {!uploading && embedUrl && (
        <div style={{ ...mediaPreviewWrap, aspectRatio: "16/9" }}>
          <iframe
            src={embedUrl}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              borderRadius: 8,
            }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Block dispatcher — FIXED (sin contentEditable wrapper)
// ─────────────────────────────────────────────

function Block({
  block,
  allBlocks,
  blockIndex,
  refSetter,
  onFocus,
  onInput,
  onKeyDown,
  removeBlock,
  updateBlockContent,
  insertBlockAfter,
}: {
  block: EditorBlock;
  allBlocks: EditorBlock[];
  blockIndex: number;
  refSetter: (el: HTMLElement | null) => void;
  onFocus: () => void;
  onInput: (e: React.FormEvent<HTMLElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void;
  removeBlock: (id: string) => void;
  updateBlockContent: (id: string, content: string) => void;
  insertBlockAfter: (id: string) => void;
}) {
  const editableProps = {
    initialContent: block.content,
    onFocus,
    onInput,
    onKeyDown,
    style: getBlockStyle(block.type),
    className: "editable-block",
    "data-placeholder": placeholderByType(block.type),
  };

  if (block.type === "bullet-list") {
    return (
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <span style={listBullet}>•</span>
        <EditableDiv
          ref={refSetter}
          {...editableProps}
          style={{ ...getBlockStyle("bullet-list"), flex: 1 }}
        />
      </div>
    );
  }

  if (block.type === "numbered-list") {
    let itemNumber = 1;
    for (let i = blockIndex - 1; i >= 0; i--) {
      if (allBlocks[i].type === "numbered-list") itemNumber++;
      else break;
    }
    return (
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <span style={listBullet}>{itemNumber}.</span>
        <EditableDiv
          ref={refSetter}
          {...editableProps}
          style={{ ...getBlockStyle("numbered-list"), flex: 1 }}
        />
      </div>
    );
  }

  // contentEditable={false} evita que el navegador trate el contenido como texto editable
  if (block.type === "image") {
    return (
      <div contentEditable={false}>
        <ImageBlock
          block={block}
          refSetter={refSetter}
          removeBlock={removeBlock}
          updateBlockContent={updateBlockContent}
          insertBlockAfter={insertBlockAfter}
        />
      </div>
    );
  }

  // contentEditable={false} evita que el navegador trate el contenido como texto editable
  if (block.type === "video") {
    return (
      <div contentEditable={false}>
        <VideoBlock
          block={block}
          refSetter={refSetter}
          removeBlock={removeBlock}
          updateBlockContent={updateBlockContent}
          insertBlockAfter={insertBlockAfter}
        />
      </div>
    );
  }

  const tag = block.type === "h1" ? "h1" : block.type === "h2" ? "h2" : "div";
  return <EditableDiv tag={tag} ref={refSetter} {...editableProps} />;
}

// ─────────────────────────────────────────────
// Main editor
// ─────────────────────────────────────────────

interface TextEditorBlockProps {
  initialBlocks?: EditorBlock[];
  onChange?: (blocks: EditorBlock[]) => void;
}

export default function TextEditorBlock({
  initialBlocks,
  onChange,
}: TextEditorBlockProps = {}) {
  const [blocks, setBlocks] = useState<EditorBlock[]>(
    () =>
      initialBlocks ?? [
        newBlock("h1", "Mi Documento"),
        newBlock("paragraph", ""),
      ],
  );
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [slashMenu, setSlashMenu] = useState({
    open: false,
    blockId: null as string | null,
    query: "",
    x: 0,
    y: 0,
    selectedIndex: 0,
  });

  const refs = useRef<Record<string, HTMLElement | null>>({});
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onChangeRef.current?.(blocks);
  }, [blocks]);

  const filteredCommands = useMemo(() => {
    const q = slashMenu.query.toLowerCase().trim();
    if (!q) return BLOCK_TYPES;
    return BLOCK_TYPES.filter(
      (t) =>
        t.label.toLowerCase().includes(q) || t.key.toLowerCase().includes(q),
    );
  }, [slashMenu.query]);

  const focusBlock = useCallback((id: string, atEnd = true) => {
    requestAnimationFrame(() => {
      const el = refs.current[id];
      if (!el) return;
      el.focus();
      const sel = window.getSelection();
      if (!sel) return;
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(atEnd);
      sel.removeAllRanges();
      sel.addRange(range);
    });
  }, []);

  const updateBlockContent = useCallback((id: string, content: string) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, content } : b)));
  }, []);

  const updateBlockType = useCallback((id: string, type: BlockType) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, type } : b)));
  }, []);

  const insertBlockAfter = useCallback(
    (id: string, type: BlockType = "paragraph", content = "") => {
      setBlocks((prev) => {
        const current = prev.find((b) => b.id === id);
        const resolvedType: BlockType =
          (current?.type === "bullet-list" ||
            current?.type === "numbered-list") &&
          type === "paragraph"
            ? current.type
            : type;

        const block = newBlock(resolvedType, content);
        const idx = prev.findIndex((b) => b.id === id);
        const copy = [...prev];
        copy.splice(idx + 1, 0, block);

        setActiveBlockId(block.id);
        focusBlock(block.id);
        return copy;
      });
    },
    [focusBlock],
  );

  const removeBlock = useCallback(
    (id: string) => {
      setBlocks((prev) => {
        if (prev.length === 1) return [newBlock("paragraph", "")];
        const idx = prev.findIndex((b) => b.id === id);
        const siblingId = prev[idx - 1]?.id ?? prev[idx + 1]?.id;
        const filtered = prev.filter((b) => b.id !== id);

        requestAnimationFrame(() => {
          if (siblingId) {
            setActiveBlockId(siblingId);
            focusBlock(siblingId, true);
          }
        });

        return filtered;
      });
    },
    [focusBlock],
  );

  const openSlashMenu = useCallback((blockId: string, query = "") => {
    const el = refs.current[blockId];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setSlashMenu({
      open: true,
      blockId,
      query,
      x: rect.left + 24,
      y: rect.bottom + 6,
      selectedIndex: 0,
    });
  }, []);

  const closeSlashMenu = useCallback(() => {
    setSlashMenu({
      open: false,
      blockId: null,
      query: "",
      x: 0,
      y: 0,
      selectedIndex: 0,
    });
  }, []);

  const applySlashCommand = useCallback(
    (type: BlockType) => {
      setSlashMenu((s) => {
        if (!s.blockId) return s;
        const blockId = s.blockId;

        setBlocks((prev) =>
          prev.map((b) => {
            if (b.id !== blockId) return b;
            const cleaned = b.content.replace(/^\/\S*\s*/, "");
            return { ...b, type, content: cleaned };
          }),
        );

        // Para bloques de media no manipulamos el DOM ni enfocamos
        if (type !== "image" && type !== "video") {
          requestAnimationFrame(() => {
            const el = refs.current[blockId];
            if (el) el.innerText = el.innerText.replace(/^\/\S*\s*/, "");
            focusBlock(blockId);
          });
        }

        return {
          open: false,
          blockId: null,
          query: "",
          x: 0,
          y: 0,
          selectedIndex: 0,
        };
      });
    },
    [focusBlock],
  );

  const handleInput = useCallback(
    (e: React.FormEvent<HTMLElement>, block: EditorBlock) => {
      const text = (e.currentTarget as HTMLElement).innerText;
      updateBlockContent(block.id, text);

      if (text.startsWith("/")) {
        openSlashMenu(block.id, text.slice(1));
      } else if (slashMenu.open && slashMenu.blockId === block.id) {
        closeSlashMenu();
      }
    },
    [updateBlockContent, openSlashMenu, closeSlashMenu, slashMenu],
  );

  const handleKeyDown = useCallback(
    (
      e: React.KeyboardEvent<HTMLElement>,
      block: EditorBlock,
      index: number,
    ) => {
      const el = e.currentTarget as HTMLElement;
      const text = el.innerText ?? "";

      if (slashMenu.open && slashMenu.blockId === block.id) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSlashMenu((s) => ({
            ...s,
            selectedIndex: Math.min(
              s.selectedIndex + 1,
              filteredCommands.length - 1,
            ),
          }));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSlashMenu((s) => ({
            ...s,
            selectedIndex: Math.max(s.selectedIndex - 1, 0),
          }));
          return;
        }
        if (e.key === "Enter" && filteredCommands.length) {
          e.preventDefault();
          applySlashCommand(
            filteredCommands[slashMenu.selectedIndex].key as BlockType,
          );
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          closeSlashMenu();
          return;
        }
      }

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (
          (block.type === "bullet-list" || block.type === "numbered-list") &&
          text.trim() === ""
        ) {
          updateBlockType(block.id, "paragraph");
          return;
        }
        insertBlockAfter(block.id);
        return;
      }

      if (e.key === "Backspace" && text.trim() === "") {
        e.preventDefault();
        removeBlock(block.id);
        return;
      }

      if (e.key === " " && text === "#") {
        e.preventDefault();
        updateBlockType(block.id, "h1");
        updateBlockContent(block.id, "");
        el.innerText = "";
        return;
      }
      if (e.key === " " && text === "##") {
        e.preventDefault();
        updateBlockType(block.id, "h2");
        updateBlockContent(block.id, "");
        el.innerText = "";
        return;
      }
      if (e.key === " " && text === "-") {
        e.preventDefault();
        updateBlockType(block.id, "bullet-list");
        updateBlockContent(block.id, "");
        el.innerText = "";
        return;
      }
      if (e.key === " " && text === "1.") {
        e.preventDefault();
        updateBlockType(block.id, "numbered-list");
        updateBlockContent(block.id, "");
        el.innerText = "";
        return;
      }

      if (e.key === "ArrowUp" && index > 0 && caretAtStart(el)) {
        e.preventDefault();
        const prevId = blocks[index - 1].id;
        setActiveBlockId(prevId);
        focusBlock(prevId, true);
      }
      if (
        e.key === "ArrowDown" &&
        index < blocks.length - 1 &&
        caretAtEnd(el)
      ) {
        e.preventDefault();
        const nextId = blocks[index + 1].id;
        setActiveBlockId(nextId);
        focusBlock(nextId, false);
      }
    },
    [
      slashMenu,
      filteredCommands,
      applySlashCommand,
      closeSlashMenu,
      updateBlockType,
      updateBlockContent,
      insertBlockAfter,
      removeBlock,
      blocks,
      focusBlock,
    ],
  );

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (!slashMenu.open) return;
      const menu = document.getElementById("slash-menu");
      if (menu && !menu.contains(e.target as Node)) closeSlashMenu();
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [slashMenu.open, closeSlashMenu]);

  return (
    <>
      <style>{`
        .editable-block:empty::before {
          content: attr(data-placeholder);
          color: #3d3d3d;
          pointer-events: none;
        }
        .block-row:hover .left-controls { opacity: 1 !important; }
      `}</style>

      <div style={styles.page}>
        <div style={styles.container}>
          {blocks.map((block, index) => (
            <div
              key={block.id}
              className="block-row"
              style={{
                ...styles.blockRow,
                background:
                  activeBlockId === block.id
                    ? "rgba(255,255,255,0.02)"
                    : "transparent",
              }}
              onMouseEnter={() => setActiveBlockId(block.id)}
            >
              <div className="left-controls" style={styles.leftControls}>
                <button
                  style={styles.iconBtn}
                  title="Agregar bloque"
                  onClick={() => insertBlockAfter(block.id)}
                >
                  +
                </button>
                <span style={styles.iconBtn} title="Arrastrar">
                  ⋮⋮
                </span>
              </div>

              <div style={styles.blockContentWrap}>
                <Block
                  block={block}
                  allBlocks={blocks}
                  blockIndex={index}
                  refSetter={(el) => {
                    refs.current[block.id] = el;
                  }}
                  onFocus={() => setActiveBlockId(block.id)}
                  onInput={(e) => handleInput(e, block)}
                  onKeyDown={(e) => handleKeyDown(e, block, index)}
                  removeBlock={removeBlock}
                  updateBlockContent={updateBlockContent}
                  insertBlockAfter={insertBlockAfter}
                />
              </div>
            </div>
          ))}
        </div>

        {slashMenu.open && filteredCommands.length > 0 && (
          <div
            id="slash-menu"
            style={{ ...styles.slashMenu, left: slashMenu.x, top: slashMenu.y }}
          >
            <p style={styles.slashHeading}>BLOQUES</p>
            {filteredCommands.map((cmd, i) => (
              <button
                key={cmd.key}
                style={{
                  ...styles.slashItem,
                  ...(i === slashMenu.selectedIndex
                    ? styles.slashItemActive
                    : {}),
                }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applySlashCommand(cmd.key as BlockType)}
              >
                <span style={styles.slashIcon}>{cmd.icon}</span>
                <span>{cmd.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const mediaInputRow: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  alignItems: "flex-end",
  width: "100%",
};

const mediaColumn: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  flex: "1 1 160px",
  minWidth: 0,
};

const mediaLabel: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  color: "#6B6B6B",
  marginBottom: 5,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const mediaBtn: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "8px 12px",
  border: "1px solid #2D2D2D",
  borderRadius: 8,
  background: "#1A1A1A",
  color: "#EDEDED",
  fontSize: 13,
  textAlign: "left",
  boxSizing: "border-box",
};

const mediaInput = (invalid = false): React.CSSProperties => ({
  display: "block",
  width: "100%",
  padding: "8px 12px",
  border: `1px solid ${invalid ? "#E53E3E" : "#2D2D2D"}`,
  borderRadius: 8,
  background: "#1A1A1A",
  color: "#EDEDED",
  boxSizing: "border-box",
  fontSize: 14,
  outline: "none",
});

const mediaPreviewWrap: React.CSSProperties = {
  marginTop: 12,
  borderRadius: 8,
  overflow: "hidden",
  width: "100%",
};

const clearBtn: React.CSSProperties = {
  padding: "8px 14px",
  background: "#3D1515",
  color: "#FF6B6B",
  border: "1px solid #5a2020",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 13,
  whiteSpace: "nowrap",
  alignSelf: "flex-end",
};

const uploadedBadge: React.CSSProperties = {
  display: "inline-block",
  marginTop: 6,
  fontSize: 12,
  color: "#68D391",
};

const listBullet: React.CSSProperties = {
  color: "#6B6B6B",
  minWidth: 20,
  fontSize: 16,
  paddingTop: 2,
};

const errorText: React.CSSProperties = {
  color: "#E53E3E",
  fontSize: 13,
  marginTop: 8,
};

const uploadOverlayStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginTop: 12,
  padding: "10px 14px",
  background: "#1A1A1A",
  borderRadius: 8,
  border: "1px solid #2D2D2D",
};

const spinnerStyle: React.CSSProperties = {
  width: 16,
  height: 16,
  borderRadius: "50%",
  border: "2px solid #333",
  borderTopColor: "#AFAFAF",
  animation: "spin 0.8s linear infinite",
};

const styles = {
  page: {
    background: "#191919",
    color: "#fff",
    padding: "60px 24px",
    fontFamily: '"Geist", "Inter", ui-sans-serif, system-ui, sans-serif',
  } as React.CSSProperties,
  container: { maxWidth: 720, margin: "0 auto" } as React.CSSProperties,
  blockRow: {
    display: "grid",
    gridTemplateColumns: "44px 1fr",
    alignItems: "start",
    gap: 6,
    padding: "3px 0",
    borderRadius: 6,
    transition: "background 0.1s",
  } as React.CSSProperties,
  leftControls: {
    opacity: 0,
    display: "flex",
    gap: 2,
    alignItems: "center",
    paddingTop: 4,
    transition: "opacity 0.15s",
  } as React.CSSProperties,
  iconBtn: {
    width: 20,
    height: 20,
    borderRadius: 4,
    border: "none",
    background: "transparent",
    color: "#6B6B6B",
    cursor: "pointer",
    fontSize: 13,
    lineHeight: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  } as React.CSSProperties,
  blockContentWrap: { padding: "2px 0" } as React.CSSProperties,
  slashMenu: {
    position: "fixed",
    width: 260,
    background: "#1E1E1E",
    border: "1px solid #2D2D2D",
    borderRadius: 10,
    padding: "6px 6px 8px",
    boxShadow: "0 16px 40px rgba(0,0,0,.5)",
    zIndex: 1000,
  } as React.CSSProperties,
  slashHeading: {
    fontSize: 10,
    letterSpacing: "0.1em",
    color: "#555",
    padding: "4px 10px 6px",
    margin: 0,
    fontWeight: 600,
  } as React.CSSProperties,
  slashItem: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 10,
    border: "none",
    background: "transparent",
    color: "#EAEAEA",
    padding: "8px 10px",
    borderRadius: 7,
    cursor: "pointer",
    textAlign: "left",
    fontSize: 14,
  } as React.CSSProperties,
  slashItemActive: { background: "#2C2C2C" } as React.CSSProperties,
  slashIcon: {
    width: 26,
    height: 26,
    background: "#2A2A2A",
    border: "1px solid #333",
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#BDBDBD",
    fontSize: 12,
    flexShrink: 0,
  } as React.CSSProperties,
};
