// Tipos para el sistema de bloques enriquecido tipo Notion

export type TextFormat = "plain" | "h1" | "h2" | "h3" | "quote" | "code";
export type ListType = "none" | "bullet" | "ordered";
export type QuestionType = "single-choice" | "multiple-choice" | "matching" | "ordering";

export interface TextBlock {
  type: "text";
  id: string;
  content: string;
  format: TextFormat;
  listType: ListType;
}

export interface ImageBlock {
  type: "image";
  id: string;
  url: string;
  caption?: string;
}

export interface VideoBlock {
  type: "video";
  id: string;
  url: string;
  caption?: string;
}

export type ContentBlock = TextBlock | ImageBlock | VideoBlock;

export interface Option {
  id: string;
  blocks: ContentBlock[];
}

export interface MatchingPair {
  id: string;
  leftBlocks: ContentBlock[];
  rightBlocks: ContentBlock[];
}

export interface OrderingItem {
  id: string;
  blocks: ContentBlock[];
}

// Preguntas base
interface QuestionBase {
  id: string;
  blocks: ContentBlock[];
}

// Tipos de preguntas específicos
export interface SingleChoiceQuestion extends QuestionBase {
  type: "single-choice";
  opciones: Option[];
  respuestacorrecta: number;
}

export interface MultipleChoiceQuestion extends QuestionBase {
  type: "multiple-choice";
  opciones: Option[];
  respuestascorrectas: number[];
}

export interface MatchingQuestion extends QuestionBase {
  type: "matching";
  pairs: MatchingPair[];
  correctPairings: number[]; // Para cada pair, el índice de rightBlocks que es correcto
}

export interface OrderingQuestion extends QuestionBase {
  type: "ordering";
  items: OrderingItem[];
  correctOrder: string[]; // IDs en orden correcto
}

export type QuestionWithBlocks = 
  | SingleChoiceQuestion 
  | MultipleChoiceQuestion 
  | MatchingQuestion 
  | OrderingQuestion;

// Comandos slash disponibles
export interface SlashCommand {
  id: string;
  label: string;
  description: string;
  icon: string;
  action: (currentText: string) => { 
    format?: TextFormat; 
    listType?: ListType; 
    text?: string;
    type?: "format" | "insert-image" | "insert-video";
  };
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: "text",
    label: "Texto",
    description: "Texto simple",
    icon: "📝",
    action: () => ({ format: "plain", listType: "none", text: "", type: "format" }),
  },
  {
    id: "h1",
    label: "Encabezado 1",
    description: "Título grande",
    icon: "H1",
    action: () => ({ format: "h1", listType: "none", text: "", type: "format" }),
  },
  {
    id: "h2",
    label: "Encabezado 2",
    description: "Título mediano",
    icon: "H2",
    action: () => ({ format: "h2", listType: "none", text: "", type: "format" }),
  },
  {
    id: "h3",
    label: "Encabezado 3",
    description: "Título pequeño",
    icon: "H3",
    action: () => ({ format: "h3", listType: "none", text: "", type: "format" }),
  },
  {
    id: "bullet",
    label: "Lista desordenada",
    description: "Viñetas",
    icon: "• ",
    action: () => ({ format: "plain", listType: "bullet", text: "• ", type: "format" }),
  },
  {
    id: "ordered",
    label: "Lista ordenada",
    description: "Lista numerada",
    icon: "1.",
    action: () => ({ format: "plain", listType: "ordered", text: "1. ", type: "format" }),
  },
  {
    id: "quote",
    label: "Cita",
    description: "Bloque de cita",
    icon: "❝",
    action: () => ({ format: "quote", listType: "none", text: "", type: "format" }),
  },
  {
    id: "code",
    label: "Código",
    description: "Bloque de código",
    icon: "</code>",
    action: () => ({ format: "code", listType: "none", text: "", type: "format" }),
  },
  {
    id: "image",
    label: "Imagen",
    description: "Insertar una imagen",
    icon: "🖼️",
    action: () => ({ type: "insert-image" }),
  },
  {
    id: "video",
    label: "Video",
    description: "Insertar un video",
    icon: "🎬",
    action: () => ({ type: "insert-video" }),
  },
];

// Tipos de preguntas disponibles
export const QUESTION_TYPES = [
  {
    id: "single-choice",
    label: "Selección única",
    description: "Una opción correcta",
    icon: "◐",
  },
  {
    id: "multiple-choice",
    label: "Selección múltiple",
    description: "Varias opciones correctas",
    icon: "☑",
  },
  {
    id: "matching",
    label: "Relacionar afirmaciones",
    description: "Emparejar elementos",
    icon: "↔",
  },
  {
    id: "ordering",
    label: "Ordenar respuestas",
    description: "Secuenciar elementos",
    icon: "↓",
  },
];
