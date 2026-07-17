import { useEffect, useImperativeHandle, useRef, forwardRef } from "react";
import grapesjs, { Editor } from "grapesjs";
import presetNewsletter from "grapesjs-preset-newsletter";
import "grapesjs/dist/css/grapes.min.css";
import { uploadImageToFirebase } from "../../../../utils/uploadImageToFirebase";

export type BuilderVariable = {
  /** Token tal cual se inserta, ej: "{{nombres}}" */
  token: string;
  /** Descripción legible */
  label: string;
};

export type EmailBuilderHandle = {
  /** Devuelve el HTML completo (con estilos inline) y el diseño serializado. */
  getData: () => { html: string; design: any };
  /** Carga un diseño serializado en el editor. */
  loadDesign: (design: any) => void;
  /** Carga HTML crudo en el editor (fallback si no hay diseño). */
  loadHtml: (html: string) => void;
};

type Props = {
  /** Diseño serializado guardado (getProjectData) para reeditar. */
  initialDesign?: any;
  /** HTML guardado, usado si no hay diseño serializado. */
  initialHtml?: string;
  /** Variables disponibles, expuestas como bloques arrastrables. */
  variables: BuilderVariable[];
  /** Se llama en cada cambio con el HTML inline y el diseño. */
  onChange?: (data: { html: string; design: any }) => void;
};

/** HTML mínimo por defecto cuando no hay diseño ni HTML previos. */
const EMPTY_HTML =
  '<table style="width:100%;max-width:640px;margin:0 auto;background:#ffffff;">' +
  '<tr><td style="padding:24px;font-family:Arial,sans-serif;font-size:14px;color:#111827;">' +
  "Escribe aquí tu correo…</td></tr></table>";

/**
 * Constructor visual de correos (tipo Canva) basado en GrapesJS + preset
 * newsletter. Permite arrastrar bloques (texto, imagen, columnas, botón),
 * subir imágenes a Firebase y exportar HTML email-safe con estilos inline.
 */
const EmailBuilder = forwardRef<EmailBuilderHandle, Props>(function EmailBuilder(
  { initialDesign, initialHtml, variables, onChange },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useImperativeHandle(ref, () => ({
    getData: () => getEditorData(editorRef.current),
    loadDesign: (design: any) => {
      const ed = editorRef.current;
      if (ed && design) ed.loadProjectData(design);
    },
    loadHtml: (html: string) => {
      editorRef.current?.setComponents(html || EMPTY_HTML);
    },
  }));

  useEffect(() => {
    if (!containerRef.current || editorRef.current) return;

    const editor = grapesjs.init({
      container: containerRef.current,
      height: "600px",
      fromElement: false,
      storageManager: false,
      // Sube las imágenes a Firebase y las agrega al gestor de assets.
      // (uploadFile/uploadText no están en los tipos pero sí en runtime.)
      assetManager: {
        uploadText: "Arrastra imágenes o haz clic para subir",
        addBtnText: "Agregar imagen por URL",
        uploadFile: async (e: any) => {
          const files: File[] =
            e.dataTransfer?.files || e.target?.files || [];
          for (const file of Array.from(files)) {
            try {
              const url = await uploadImageToFirebase(file, "email_templates");
              editor.AssetManager.add(url);
            } catch {
              // Ignora el archivo que falle; el resto continúa.
            }
          }
        },
      } as any,
      plugins: [
        (ed: Editor) =>
          presetNewsletter(ed, {
            modalTitleImport: "Importar plantilla",
            modalTitleExport: "Código del correo",
            cellStyle: {
              "font-size": "14px",
              "font-family": "Arial, Helvetica, sans-serif",
              padding: "0",
              margin: "0",
              "vertical-align": "top",
            },
          }),
      ],
    });

    editorRef.current = editor;

    // Hace cada imagen responsiva (no se desborda ni se recorta en móvil) y
    // redimensionable manteniendo la proporción al arrastrar las esquinas.
    const makeImageResponsive = (component: any) => {
      if (!component || component.get?.("type") !== "image") return;
      component.addStyle({
        "max-width": "100%",
        height: "auto",
        display: "block",
      });
      // Solo esquinas + proporción fija => ancho controlado, sin deformar.
      component.set("resizable", {
        ratioDefault: true,
        tl: 1,
        tr: 1,
        bl: 1,
        br: 1,
        tc: 0,
        bc: 0,
        cl: 0,
        cr: 0,
      });
    };
    editor.on("component:add", makeImageResponsive);
    editor.on("load", () => {
      // Aplica a las imágenes que llegan en la plantilla cargada.
      editor.getWrapper()?.onAll(makeImageResponsive);
    });

    // Bloques de variables: cada una se arrastra como un token de texto.
    variables.forEach((v) => {
      editor.BlockManager.add(`var-${v.token}`, {
        label: `🔖 ${v.label}`,
        category: "Variables",
        content: `<span data-gjs-type="text" style="display:inline;">${v.token}</span>`,
        attributes: { title: `Inserta ${v.token}` },
      });
    });

    // Carga inicial: diseño serializado > HTML previo > plantilla vacía.
    if (initialDesign) {
      try {
        editor.loadProjectData(initialDesign);
      } catch {
        editor.setComponents(initialHtml || EMPTY_HTML);
      }
    } else {
      editor.setComponents(initialHtml || EMPTY_HTML);
    }
    // Asegura imágenes responsivas en el contenido recién cargado.
    editor.getWrapper()?.onAll(makeImageResponsive);

    // Notifica cambios (debounce ligero para no saturar).
    let timer: ReturnType<typeof setTimeout> | null = null;
    const notify = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (onChangeRef.current) {
          onChangeRef.current(getEditorData(editor));
        }
      }, 400);
    };
    editor.on("update", notify);
    editor.on("component:update", notify);
    editor.on("component:add", notify);
    editor.on("component:remove", notify);

    return () => {
      if (timer) clearTimeout(timer);
      editor.destroy();
      editorRef.current = null;
    };
    // Se inicializa una sola vez; los datos se recargan vía ref si cambian.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} />;
});

/** Extrae HTML con estilos inline (email-safe) + diseño serializado. */
function getEditorData(editor: Editor | null): { html: string; design: any } {
  if (!editor) return { html: "", design: null };
  let html = "";
  try {
    // Comando del preset newsletter: devuelve el HTML con estilos inline.
    html = (editor.runCommand("gjs-get-inlined-html") as string) || "";
  } catch {
    html = editor.getHtml();
  }
  if (!html) html = editor.getHtml();
  const design = editor.getProjectData();
  return { html, design };
}

export default EmailBuilder;
