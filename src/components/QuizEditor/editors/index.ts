/**
 * Exporta todos los editores de preguntas
 * Punto centralizado para importar editores
 */

export { default as SingleChoiceEditor } from './SingleChoiceEditor';
export { default as MultipleChoiceEditor } from './MultipleChoiceEditor';
export { default as MatchingEditor } from './MatchingEditor';
export { default as OrderingEditor } from './OrderingEditor';

import SingleChoiceEditor from './SingleChoiceEditor';
import MultipleChoiceEditor from './MultipleChoiceEditor';
import MatchingEditor from './MatchingEditor';
import OrderingEditor from './OrderingEditor';

/**
 * Selecciona el editor apropiado según el tipo de pregunta
 */
export function getEditorForQuestion(type: string) {
  switch (type) {
    case 'single-choice':
      return SingleChoiceEditor;
    case 'multiple-choice':
      return MultipleChoiceEditor;
    case 'matching':
      return MatchingEditor;
    case 'ordering':
      return OrderingEditor;
    default:
      return null;
  }
}
