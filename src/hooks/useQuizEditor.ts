/**
 * Hooks para manejo de editores de preguntas
 * Centraliza la lógica de edición de diferentes tipos de preguntas
 */

import { useState, useCallback } from 'react';
import {
  QuestionWithBlocks,
  SingleChoiceQuestion,
  MultipleChoiceQuestion,
  MatchingQuestion,
  OrderingQuestion,
} from '../components/QuizEditor/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Hook para manejo de preguntas en el quiz
 */
export function useQuizQuestions(initialQuestions: QuestionWithBlocks[] = []) {
  const [questions, setQuestions] = useState<QuestionWithBlocks[]>(initialQuestions);

  const addQuestion = useCallback((type: string = 'single-choice') => {
    const newQuestion = createEmptyQuestion(type);
    setQuestions((prev) => [...prev, newQuestion]);
  }, []);

  const updateQuestion = useCallback((index: number, updatedQuestion: QuestionWithBlocks) => {
    setQuestions((prev) => {
      const newQuestions = [...prev];
      newQuestions[index] = updatedQuestion;
      return newQuestions;
    });
  }, []);

  const removeQuestion = useCallback((index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const reorderQuestions = useCallback((fromIndex: number, toIndex: number) => {
    setQuestions((prev) => {
      const newQuestions = [...prev];
      const [removed] = newQuestions.splice(fromIndex, 1);
      newQuestions.splice(toIndex, 0, removed);
      return newQuestions;
    });
  }, []);

  const clearAllQuestions = useCallback(() => {
    setQuestions([]);
  }, []);

  return {
    questions,
    addQuestion,
    updateQuestion,
    removeQuestion,
    reorderQuestions,
    clearAllQuestions,
    setQuestions,
  };
}

/**
 * Hook para manejo de opciones (Single Choice y Multiple Choice)
 */
export function useQuestionOptions() {
  const createEmptyOption = useCallback(
    () => ({
      id: uuidv4(),
      blocks: [
        {
          type: 'text' as const,
          id: uuidv4(),
          content: '',
          format: 'plain' as const,
          listType: 'none' as const,
        },
      ],
    }),
    []
  );

  const addOption = useCallback(
    (options: any[]) => {
      return [...options, createEmptyOption()];
    },
    [createEmptyOption]
  );

  const removeOption = useCallback(
    (options: any[], index: number) => {
      return options.filter((_, i) => i !== index);
    },
    []
  );

  const updateOptionBlocks = useCallback(
    (options: any[], index: number, blocks: any[]) => {
      const newOptions = [...options];
      newOptions[index] = { ...newOptions[index], blocks };
      return newOptions;
    },
    []
  );

  return {
    createEmptyOption,
    addOption,
    removeOption,
    updateOptionBlocks,
  };
}

/**
 * Hook para manejo de pares de emparejamiento
 */
export function useMatchingPairs() {
  const createEmptyPair = useCallback(
    () => ({
      id: uuidv4(),
      leftBlocks: [
        {
          type: 'text' as const,
          id: uuidv4(),
          content: '',
          format: 'plain' as const,
          listType: 'none' as const,
        },
      ],
      rightBlocks: [
        {
          type: 'text' as const,
          id: uuidv4(),
          content: 'Opción 1',
          format: 'plain' as const,
          listType: 'none' as const,
        },
        {
          type: 'text' as const,
          id: uuidv4(),
          content: 'Opción 2',
          format: 'plain' as const,
          listType: 'none' as const,
        },
      ],
    }),
    []
  );

  const addPair = useCallback(
    (pairs: any[], correctPairings: number[]) => {
      const newPair = createEmptyPair();
      const newCorrectPairings = [...correctPairings, 0];
      return { pairs: [...pairs, newPair], correctPairings: newCorrectPairings };
    },
    [createEmptyPair]
  );

  const removePair = useCallback(
    (pairs: any[], index: number, correctPairings: number[]) => {
      const newCorrectPairings = correctPairings.filter((_, i) => i !== index);
      return {
        pairs: pairs.filter((_, i) => i !== index),
        correctPairings: newCorrectPairings,
      };
    },
    []
  );

  const updatePairSide = useCallback(
    (pairs: any[], pairIndex: number, side: 'left' | 'right', blocks: any[]) => {
      const newPairs = [...pairs];
      newPairs[pairIndex] = {
        ...newPairs[pairIndex],
        [side === 'left' ? 'leftBlocks' : 'rightBlocks']: blocks,
      };
      return newPairs;
    },
    []
  );

  const addRightOption = useCallback(
    (pairs: any[], pairIndex: number) => {
      const newPairs = [...pairs];
      const newOption = {
        type: 'text' as const,
        id: uuidv4(),
        content: '',
        format: 'plain' as const,
        listType: 'none' as const,
      };
      newPairs[pairIndex].rightBlocks.push(newOption);
      return newPairs;
    },
    []
  );

  const removeRightOption = useCallback(
    (pairs: any[], pairIndex: number, optionIndex: number, correctPairings: number[]) => {
      const newPairs = [...pairs];
      newPairs[pairIndex].rightBlocks = newPairs[pairIndex].rightBlocks.filter(
        (_: any, i: number) => i !== optionIndex
      );

      const newCorrectPairings = [...correctPairings];
      if (newCorrectPairings[pairIndex] === optionIndex) {
        newCorrectPairings[pairIndex] = 0;
      } else if (newCorrectPairings[pairIndex] > optionIndex) {
        newCorrectPairings[pairIndex]--;
      }

      return { pairs: newPairs, correctPairings: newCorrectPairings };
    },
    []
  );

  return {
    createEmptyPair,
    addPair,
    removePair,
    updatePairSide,
    addRightOption,
    removeRightOption,
  };
}

/**
 * Hook para manejo de elementos de ordenamiento
 */
export function useOrderingItems() {
  const createEmptyItem = useCallback(
    () => ({
      id: uuidv4(),
      blocks: [
        {
          type: 'text' as const,
          id: uuidv4(),
          content: '',
          format: 'plain' as const,
          listType: 'none' as const,
        },
      ],
    }),
    []
  );

  const addItem = useCallback(
    (items: any[]) => {
      return [...items, createEmptyItem()];
    },
    [createEmptyItem]
  );

  const removeItem = useCallback(
    (items: any[], index: number) => {
      return items.filter((_, i) => i !== index);
    },
    []
  );

  const updateItemBlocks = useCallback(
    (items: any[], index: number, blocks: any[]) => {
      const newItems = [...items];
      newItems[index] = { ...newItems[index], blocks };
      return newItems;
    },
    []
  );

  const reorderItems = useCallback(
    (items: any[], fromIndex: number, toIndex: number) => {
      const newItems = [...items];
      const [removed] = newItems.splice(fromIndex, 1);
      newItems.splice(toIndex, 0, removed);
      return newItems;
    },
    []
  );

  return {
    createEmptyItem,
    addItem,
    removeItem,
    updateItemBlocks,
    reorderItems,
  };
}

/**
 * Crea una pregunta vacía del tipo especificado
 */
export function createEmptyQuestion(type: string = 'single-choice'): QuestionWithBlocks {
  const baseQuestion = {
    id: uuidv4(),
    blocks: [
      {
        type: 'text' as const,
        id: uuidv4(),
        content: '',
        format: 'plain' as const,
        listType: 'none' as const,
      },
    ],
  };

  switch (type) {
    case 'multiple-choice':
      return {
        ...baseQuestion,
        type: 'multiple-choice',
        opciones: [
          {
            id: uuidv4(),
            blocks: [
              {
                type: 'text' as const,
                id: uuidv4(),
                content: '',
                format: 'plain' as const,
                listType: 'none' as const,
              },
            ],
          },
          {
            id: uuidv4(),
            blocks: [
              {
                type: 'text' as const,
                id: uuidv4(),
                content: '',
                format: 'plain' as const,
                listType: 'none' as const,
              },
            ],
          },
          {
            id: uuidv4(),
            blocks: [
              {
                type: 'text' as const,
                id: uuidv4(),
                content: '',
                format: 'plain' as const,
                listType: 'none' as const,
              },
            ],
          },
          {
            id: uuidv4(),
            blocks: [
              {
                type: 'text' as const,
                id: uuidv4(),
                content: '',
                format: 'plain' as const,
                listType: 'none' as const,
              },
            ],
          },
        ],
        respuestascorrectas: [],
      } as MultipleChoiceQuestion;

    case 'matching':
      return {
        ...baseQuestion,
        type: 'matching',
        pairs: [
          {
            id: uuidv4(),
            leftBlocks: [
              {
                type: 'text' as const,
                id: uuidv4(),
                content: '',
                format: 'plain' as const,
                listType: 'none' as const,
              },
            ],
            rightBlocks: [
              {
                type: 'text' as const,
                id: uuidv4(),
                content: '',
                format: 'plain' as const,
                listType: 'none' as const,
              },
            ],
          },
          {
            id: uuidv4(),
            leftBlocks: [
              {
                type: 'text' as const,
                id: uuidv4(),
                content: '',
                format: 'plain' as const,
                listType: 'none' as const,
              },
            ],
            rightBlocks: [
              {
                type: 'text' as const,
                id: uuidv4(),
                content: '',
                format: 'plain' as const,
                listType: 'none' as const,
              },
            ],
          },
        ],
        correctPairings: [0, 1],
      } as MatchingQuestion;

    case 'ordering':
      const orderingItems = [
        {
          id: uuidv4(),
          blocks: [
            {
              type: 'text' as const,
              id: uuidv4(),
              content: '',
              format: 'plain' as const,
              listType: 'none' as const,
            },
          ],
        },
        {
          id: uuidv4(),
          blocks: [
            {
              type: 'text' as const,
              id: uuidv4(),
              content: '',
              format: 'plain' as const,
              listType: 'none' as const,
            },
          ],
        },
        {
          id: uuidv4(),
          blocks: [
            {
              type: 'text' as const,
              id: uuidv4(),
              content: '',
              format: 'plain' as const,
              listType: 'none' as const,
            },
          ],
        },
      ];
      return {
        ...baseQuestion,
        type: 'ordering',
        items: orderingItems,
        correctOrder: orderingItems.map((item) => item.id),
      } as OrderingQuestion;

    case 'single-choice':
    default:
      return {
        ...baseQuestion,
        type: 'single-choice',
        opciones: [
          {
            id: uuidv4(),
            blocks: [
              {
                type: 'text' as const,
                id: uuidv4(),
                content: '',
                format: 'plain' as const,
                listType: 'none' as const,
              },
            ],
          },
          {
            id: uuidv4(),
            blocks: [
              {
                type: 'text' as const,
                id: uuidv4(),
                content: '',
                format: 'plain' as const,
                listType: 'none' as const,
              },
            ],
          },
          {
            id: uuidv4(),
            blocks: [
              {
                type: 'text' as const,
                id: uuidv4(),
                content: '',
                format: 'plain' as const,
                listType: 'none' as const,
              },
            ],
          },
          {
            id: uuidv4(),
            blocks: [
              {
                type: 'text' as const,
                id: uuidv4(),
                content: '',
                format: 'plain' as const,
                listType: 'none' as const,
              },
            ],
          },
        ],
        respuestacorrecta: 0,
      } as SingleChoiceQuestion;
  }
}
