// @ts-nocheck
import React, { useCallback, useEffect, useRef, useState } from "react";
import TextEditorBlock, { EditorBlock } from "./TextEditorBlock";
import {
  quizService,
  Question,
  QuestionOption,
  MatchingColumn,
  MatchingAnswer,
  QuestionType,
  SCT_OPTIONS,
} from "../services/QuizService";

const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const emptyOption = (): QuestionOption => ({
  id: uid(),
  blocks: [{ id: uid(), type: "paragraph", content: "" }],
});

const emptyQuestion = (type: QuestionType = "single"): Question => {
  const base = {
    id: uid(),
    type,
    blocks: [{ id: uid(), type: "paragraph", content: "" }],
  };

  if (type === "single")
    return {
      ...base,
      options: [emptyOption(), emptyOption()],
      correctAnswer: null,
    };
  if (type === "script-concordance")
    return {
      ...base,
      // Opciones fijas del SCT — no editables por el admin
      options: SCT_OPTIONS.map((o) => ({ ...o })),
      correctAnswer: null,
    };
  if (type === "multiple")
    return {
      ...base,
      options: [emptyOption(), emptyOption()],
      correctAnswers: [],
    };
  if (type === "sorting")
    return {
      ...base,
      options: [emptyOption(), emptyOption()],
      correctOrder: [],
    };
  if (type === "matching") {
    return {
      ...base,
      columns: [
        { label: "A", options: [emptyOption()] },
        { label: "B", options: [emptyOption()] },
      ],
      matchingAnswers: [],
    };
  }
  return base;
};

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  single: "Opción única",
  multiple: "Opción múltiple",
  matching: "Relacionamiento",
  sorting: "Ordenamiento",
  "script-concordance": "Script Concordance",
};

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

/** Thin wrapper so each option gets its own TextEditorBlock instance */
function OptionEditor({
  option,
  onChangeBlocks,
}: {
  option: QuestionOption;
  onChangeBlocks: (blocks: EditorBlock[]) => void;
}) {
  return (
    <div style={optionEditorWrap}>
      <TextEditorBlock
        key={option.id}
        initialBlocks={option.blocks}
        onChange={onChangeBlocks}
      />
    </div>
  );
}

// ── Single / Multiple question editor ────────

function SingleMultipleEditor({
  question,
  onChange,
}: {
  question: Question;
  onChange: (q: Question) => void;
}) {
  const isMultiple = question.type === "multiple";

  const addOption = () =>
    onChange({
      ...question,
      options: [...(question.options ?? []), emptyOption()],
    });

  const removeOption = (optId: string) => {
    const options = (question.options ?? []).filter((o) => o.id !== optId);
    // Clean up answer references if the removed option was selected
    const correctAnswer =
      question.correctAnswer === optId ? null : question.correctAnswer;
    const correctAnswers = (question.correctAnswers ?? []).filter(
      (id) => id !== optId,
    );
    onChange({ ...question, options, correctAnswer, correctAnswers });
  };

  const updateOptionBlocks = (optId: string, blocks: EditorBlock[]) =>
    onChange({
      ...question,
      options: (question.options ?? []).map((o) =>
        o.id === optId ? { ...o, blocks } : o,
      ),
    });

  const toggleCorrect = (optId: string) => {
    if (isMultiple) {
      const current = question.correctAnswers ?? [];
      const correctAnswers = current.includes(optId)
        ? current.filter((id) => id !== optId)
        : [...current, optId];
      onChange({ ...question, correctAnswers });
    } else {
      onChange({
        ...question,
        correctAnswer: question.correctAnswer === optId ? null : optId,
      });
    }
  };

  const isCorrect = (optId: string) =>
    isMultiple
      ? (question.correctAnswers ?? []).includes(optId)
      : question.correctAnswer === optId;

  return (
    <div>
      <p style={sectionLabel}>
        {isMultiple
          ? "Opciones (puede haber varias correctas)"
          : "Opciones (una sola correcta)"}
      </p>
      {(question.options ?? []).map((opt, i) => (
        <div key={opt.id} style={optionRow}>
          {/* Correct toggle */}
          <button
            title={isCorrect(opt.id) ? "Correcta" : "Marcar como correcta"}
            onClick={() => toggleCorrect(opt.id)}
            style={{
              ...correctToggle,
              background: isCorrect(opt.id) ? "#276749" : "#1A1A1A",
              borderColor: isCorrect(opt.id) ? "#38A169" : "#2D2D2D",
              color: isCorrect(opt.id) ? "#68D391" : "#555",
            }}
          >
            ✓
          </button>

          <div style={{ flex: 1 }}>
            <span style={optionIndex}>{String.fromCharCode(65 + i)}.</span>
            <OptionEditor
              option={opt}
              onChangeBlocks={(blocks) => updateOptionBlocks(opt.id, blocks)}
            />
          </div>

          {(question.options?.length ?? 0) > 2 && (
            <button
              onClick={() => removeOption(opt.id)}
              style={removeBtn}
              title="Eliminar opción"
            >
              ✕
            </button>
          )}
        </div>
      ))}
      <button onClick={addOption} style={addOptionBtn}>
        + Agregar opción
      </button>
    </div>
  );
}

// ── Script Concordance editor ───────────────────

/**
 * Muestra las 5 opciones fijas del SCT en modo solo-lectura.
 * El admin únicamente selecciona cuál es la respuesta correcta.
 */
function ScriptConcordanceEditor({
  question,
  onChange,
}: {
  question: Question;
  onChange: (q: Question) => void;
}) {
  const toggleCorrect = (optId: string) =>
    onChange({
      ...question,
      correctAnswer: question.correctAnswer === optId ? null : optId,
    });

  return (
    <div>
      <p style={sectionLabel}>Escala SCT — selecciona la respuesta correcta</p>
      {(question.options ?? SCT_OPTIONS).map((opt) => {
        const isCorrect = question.correctAnswer === opt.id;
        const label =
          opt.blocks?.[0]?.content ?? opt.id;
        return (
          <div key={opt.id} style={{ ...optionRow, cursor: "pointer" }} onClick={() => toggleCorrect(opt.id)}>
            <button
              title={isCorrect ? "Correcta" : "Marcar como correcta"}
              onClick={(e) => { e.stopPropagation(); toggleCorrect(opt.id); }}
              style={{
                ...correctToggle,
                background: isCorrect ? "#276749" : "#1A1A1A",
                borderColor: isCorrect ? "#38A169" : "#2D2D2D",
                color: isCorrect ? "#68D391" : "#555",
              }}
            >
              ✓
            </button>
            <span style={{ color: "#CDCDCD", fontSize: 14, flex: 1 }}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Sorting question editor ───────────────────

function SortingEditor({
  question,
  onChange,
}: {
  question: Question;
  onChange: (q: Question) => void;
}) {
  const addOption = () =>
    onChange({
      ...question,
      options: [...(question.options ?? []), emptyOption()],
    });

  const removeOption = (optId: string) => {
    const options = (question.options ?? []).filter((o) => o.id !== optId);
    const correctOrder = (question.correctOrder ?? []).filter(
      (id) => id !== optId,
    );
    onChange({ ...question, options, correctOrder });
  };

  const updateOptionBlocks = (optId: string, blocks: EditorBlock[]) =>
    onChange({
      ...question,
      options: (question.options ?? []).map((o) =>
        o.id === optId ? { ...o, blocks } : o,
      ),
    });

  /**
   * correctOrder stores the IDs in the order the user drags/arranges them.
   * We initialise it from the options order when empty.
   */
  const ensureOrder = () => {
    if ((question.correctOrder ?? []).length === 0) {
      onChange({
        ...question,
        correctOrder: (question.options ?? []).map((o) => o.id),
      });
    }
  };

  const moveOption = (optId: string, direction: "up" | "down") => {
    const order =
      (question.correctOrder ?? []).length > 0
        ? [...question.correctOrder]
        : (question.options ?? []).map((o) => o.id);

    const idx = order.indexOf(optId);
    if (idx === -1) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= order.length) return;

    [order[idx], order[newIdx]] = [order[newIdx], order[idx]];
    onChange({ ...question, correctOrder: order });
  };

  // Display options in correctOrder sequence if set, otherwise insertion order
  const orderedOptions = (() => {
    const order = question.correctOrder ?? [];
    if (order.length === 0) return question.options ?? [];
    return order
      .map((id) => (question.options ?? []).find((o) => o.id === id))
      .filter(Boolean) as QuestionOption[];
  })();

  return (
    <div>
      <p style={sectionLabel}>
        Opciones — arrastra o usa las flechas para definir el orden correcto
      </p>
      {orderedOptions.map((opt, i) => (
        <div key={opt.id} style={optionRow}>
          {/* Position badge */}
          <div style={sortPositionBadge}>{i + 1}</div>

          <div style={{ flex: 1 }}>
            <OptionEditor
              option={opt}
              onChangeBlocks={(blocks) => updateOptionBlocks(opt.id, blocks)}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <button
              onClick={() => {
                ensureOrder();
                moveOption(opt.id, "up");
              }}
              disabled={i === 0}
              style={{ ...arrowBtn, opacity: i === 0 ? 0.3 : 1 }}
              title="Subir"
            >
              ▲
            </button>
            <button
              onClick={() => {
                ensureOrder();
                moveOption(opt.id, "down");
              }}
              disabled={i === orderedOptions.length - 1}
              style={{
                ...arrowBtn,
                opacity: i === orderedOptions.length - 1 ? 0.3 : 1,
              }}
              title="Bajar"
            >
              ▼
            </button>
          </div>

          {(question.options?.length ?? 0) > 2 && (
            <button
              onClick={() => removeOption(opt.id)}
              style={removeBtn}
              title="Eliminar"
            >
              ✕
            </button>
          )}
        </div>
      ))}
      <button onClick={addOption} style={addOptionBtn}>
        + Agregar opción
      </button>
    </div>
  );
}

// ── Matching question editor ──────────────────

function MatchingEditor({
  question,
  onChange,
}: {
  question: Question;
  onChange: (q: Question) => void;
}) {
  const columns = question.columns ?? [];

  // ── Column management ──

  const addColumn = () => {
    const label = String.fromCharCode(65 + columns.length); // A, B, C…
    onChange({
      ...question,
      columns: [...columns, { label, options: [emptyOption()] }],
    });
  };

  const removeColumn = (colIdx: number) => {
    if (columns.length <= 2) return; // minimum 2 columns
    const label = columns[colIdx].label;
    const newCols = columns.filter((_, i) => i !== colIdx);
    // Remove the dropped column from all matchingAnswers
    const matchingAnswers = (question.matchingAnswers ?? []).map((ma) => {
      const m = { ...ma.matches };
      delete m[label];
      return { ...ma, matches: m };
    });
    onChange({ ...question, columns: newCols, matchingAnswers });
  };

  const addOptionToColumn = (colIdx: number) => {
    const newCols = columns.map((col, i) =>
      i === colIdx ? { ...col, options: [...col.options, emptyOption()] } : col,
    );
    onChange({ ...question, columns: newCols });
  };

  const removeOptionFromColumn = (colIdx: number, optId: string) => {
    const newCols = columns.map((col, i) => {
      if (i !== colIdx) return col;
      return { ...col, options: col.options.filter((o) => o.id !== optId) };
    });

    // Remove from matchingAnswers:
    // - If it was a col-A option, remove the whole row
    // - If it was another column, clear that cell in the affected rows
    let matchingAnswers = [...(question.matchingAnswers ?? [])];
    if (colIdx === 0) {
      matchingAnswers = matchingAnswers.filter((ma) => ma.columnAId !== optId);
    } else {
      const label = columns[colIdx].label;
      matchingAnswers = matchingAnswers.map((ma) => {
        if (ma.matches[label] !== optId) return ma;
        const m = { ...ma.matches };
        delete m[label];
        return { ...ma, matches: m };
      });
    }

    onChange({ ...question, columns: newCols, matchingAnswers });
  };

  const updateOptionBlocks = (
    colIdx: number,
    optId: string,
    blocks: EditorBlock[],
  ) => {
    const newCols = columns.map((col, i) => {
      if (i !== colIdx) return col;
      return {
        ...col,
        options: col.options.map((o) =>
          o.id === optId ? { ...o, blocks } : o,
        ),
      };
    });
    onChange({ ...question, columns: newCols });
  };

  // ── Answer management ──

  /**
   * Set the answer for a specific (columnA option, column label) cell.
   * If the row doesn't exist yet, create it.
   */
  const setMatch = (
    columnAId: string,
    colLabel: string,
    selectedOptId: string,
  ) => {
    let answers = [...(question.matchingAnswers ?? [])];
    const rowIdx = answers.findIndex((ma) => ma.columnAId === columnAId);

    if (rowIdx === -1) {
      answers.push({ columnAId, matches: { [colLabel]: selectedOptId } });
    } else {
      answers[rowIdx] = {
        ...answers[rowIdx],
        matches: { ...answers[rowIdx].matches, [colLabel]: selectedOptId },
      };
    }
    onChange({ ...question, matchingAnswers: answers });
  };

  const getMatch = (columnAId: string, colLabel: string): string => {
    const row = (question.matchingAnswers ?? []).find(
      (ma) => ma.columnAId === columnAId,
    );
    return row?.matches[colLabel] ?? "";
  };

  const colA = columns[0];
  const otherCols = columns.slice(1);

  return (
    <div>
      {/* ── Column headers + options ── */}
      <div
        style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}
      >
        {columns.map((col, colIdx) => (
          <div key={col.label} style={matchingColWrap}>
            <div style={matchingColHeader}>
              <span style={{ fontWeight: 600, color: "#AFAFAF" }}>
                Columna {col.label}
              </span>
              {colIdx > 1 && (
                <button
                  onClick={() => removeColumn(colIdx)}
                  style={removeBtn}
                  title="Eliminar columna"
                >
                  ✕
                </button>
              )}
            </div>

            {col.options.map((opt) => (
              <div
                key={opt.id}
                style={{ position: "relative", marginBottom: 8 }}
              >
                <OptionEditor
                  option={opt}
                  onChangeBlocks={(blocks) =>
                    updateOptionBlocks(colIdx, opt.id, blocks)
                  }
                />
                {col.options.length > 1 && (
                  <button
                    onClick={() => removeOptionFromColumn(colIdx, opt.id)}
                    style={{
                      ...removeBtn,
                      position: "absolute",
                      top: 4,
                      right: 4,
                    }}
                    title="Eliminar opción"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            <button
              onClick={() => addOptionToColumn(colIdx)}
              style={addOptionBtn}
            >
              + Opción
            </button>
          </div>
        ))}

        <button
          onClick={addColumn}
          style={addColumnBtn}
          title="Agregar columna"
        >
          + Columna
        </button>
      </div>

      {/* ── Correct answer grid ── */}
      <p style={sectionLabel}>
        Respuestas correctas — relaciona cada opción de la columna A
      </p>

      {colA && colA.options.length > 0 && otherCols.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={matchingTable}>
            <thead>
              <tr>
                <th style={matchingTh}>Columna A</th>
                {otherCols.map((col) => (
                  <th key={col.label} style={matchingTh}>
                    Columna {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {colA.options.map((aOpt) => (
                <tr key={aOpt.id}>
                  <td style={matchingTd}>
                    <span style={{ color: "#EDEDED", fontSize: 13 }}>
                      {/* Show first block's text as label */}
                      {aOpt.blocks?.[0]?.content ||
                        `Opción A${colA.options.indexOf(aOpt) + 1}`}
                    </span>
                  </td>
                  {otherCols.map((col) => (
                    <td key={col.label} style={matchingTd}>
                      <select
                        value={getMatch(aOpt.id, col.label)}
                        onChange={(e) =>
                          setMatch(aOpt.id, col.label, e.target.value)
                        }
                        style={matchingSelect}
                      >
                        <option value="">— selecciona —</option>
                        {col.options.map((opt, i) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.blocks?.[0]?.content ||
                              `Opción ${col.label}${i + 1}`}
                          </option>
                        ))}
                      </select>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Single question card ──────────────────────

function QuestionCard({
  question,
  index,
  total,
  onChange,
  onRemove,
  onMove,
}: {
  question: Question;
  index: number;
  total: number;
  onChange: (q: Question) => void;
  onRemove: () => void;
  onMove: (dir: "up" | "down") => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const changeType = (type: QuestionType) => {
    // Preserve statement blocks, reset everything else
    onChange(emptyQuestion(type));
    // Actually keep the existing blocks:
    // (done below to avoid stale closure)
  };

  const handleTypeChange = (type: QuestionType) => {
    const fresh = emptyQuestion(type);
    onChange({ ...fresh, blocks: question.blocks });
  };

  return (
    <div style={questionCard}>
      {/* ── Card header ── */}
      <div style={questionCardHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={questionNumber}>P{index + 1}</span>
          <select
            value={question.type}
            onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
            style={typeSelect}
          >
            {Object.entries(QUESTION_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button
            onClick={() => onMove("up")}
            disabled={index === 0}
            style={{ ...arrowBtn, opacity: index === 0 ? 0.3 : 1 }}
            title="Subir"
          >
            ▲
          </button>
          <button
            onClick={() => onMove("down")}
            disabled={index === total - 1}
            style={{ ...arrowBtn, opacity: index === total - 1 ? 0.3 : 1 }}
            title="Bajar"
          >
            ▼
          </button>
          <button onClick={() => setCollapsed((c) => !c)} style={collapseBtn}>
            {collapsed ? "Expandir" : "Colapsar"}
          </button>
          <button
            onClick={onRemove}
            style={removeBtnRed}
            title="Eliminar pregunta"
          >
            Eliminar
          </button>
        </div>
      </div>

      {!collapsed && (
        <div style={{ padding: "16px 20px 20px" }}>
          {/* ── Statement ── */}
          <p style={sectionLabel}>Enunciado</p>
          <div style={statementWrap}>
            <TextEditorBlock
              key={`stmt-${question.id}`}
              initialBlocks={question.blocks}
              onChange={(blocks) => onChange({ ...question, blocks })}
            />
          </div>

          {/* ── Type-specific editor ── */}
          <div style={{ marginTop: 20 }}>
            {(question.type === "single" || question.type === "multiple") && (
              <SingleMultipleEditor question={question} onChange={onChange} />
            )}
            {question.type === "script-concordance" && (
              <ScriptConcordanceEditor question={question} onChange={onChange} />
            )}
            {question.type === "sorting" && (
              <SortingEditor question={question} onChange={onChange} />
            )}
            {question.type === "matching" && (
              <MatchingEditor question={question} onChange={onChange} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

interface QuizEditComponentProps {
  eventId: string;
}

export default function QuizEditComponent({ eventId }: QuizEditComponentProps) {
  const [questions, setQuestions] = useState<Question[]>([
    emptyQuestion("single"),
  ]);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  
  // Rastrear si el componente está montado para evitar memory leaks
  const isMountedRef = useRef(true);

  // ── Load existing quiz on mount ──

  useEffect(() => {
    let aborted = false;

    (async () => {
      try {
        const quiz = await quizService.getByEventId(eventId);
        if (aborted || !isMountedRef.current) return;
        
        if (quiz) {
          setQuizId(quiz._id);
          setQuestions(
            quiz.questions.length > 0
              ? quiz.questions
              : [emptyQuestion("single")],
          );
        }
      } catch (e) {
        if (!aborted && isMountedRef.current) {
          console.error("Error loading quiz:", e);
        }
      } finally {
        if (!aborted && isMountedRef.current) {
          setLoading(false);
        }
      }
    })();

    return () => {
      aborted = true;
    };
  }, [eventId]);

  // Cleanup al desmontar el componente
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ── Question management ──

  const addQuestion = useCallback(
    (type: QuestionType = "single") =>
      setQuestions((prev) => [...prev, emptyQuestion(type)]),
    [],
  );

  const removeQuestion = useCallback(
    (id: string) =>
      setQuestions((prev) => prev.filter((q) => q.id !== id)),
    [],
  );

  const updateQuestion = useCallback(
    (id: string, updated: Question) =>
      setQuestions((prev) => prev.map((q) => (q.id === id ? updated : q))),
    [],
  );

  const moveQuestion = useCallback(
    (id: string, dir: "up" | "down") => {
      setQuestions((prev) => {
        const idx = prev.findIndex((q) => q.id === id);
        if (idx === -1) return prev;
        const newIdx = dir === "up" ? idx - 1 : idx + 1;
        if (newIdx < 0 || newIdx >= prev.length) return prev;
        const copy = [...prev];
        [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
        return copy;
      });
    },
    [],
  );

  // ── Save ──

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const quiz = await quizService.save(
        eventId,
        questions,
        quizId ?? undefined,
      );
      setQuizId(quiz._id);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(
        e?.response?.data?.message ?? "Error al guardar. Intenta de nuevo.",
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Render ──

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={loadingWrap}>
          <div style={spinnerStyle} />
          <span style={{ color: "#AFAFAF", fontSize: 14 }}>Cargando quiz…</span>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Header ── */}
      <div style={headerBar}>
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              color: "#EDEDED",
            }}
          >
            {quizId ? "Editar quiz" : "Crear quiz"}
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6B6B6B" }}>
            {questions.length}{" "}
            {questions.length === 1 ? "pregunta" : "preguntas"}
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {saved && <span style={savedBadge}>✓ Guardado</span>}
          {error && <span style={errorBadge}>{error}</span>}
          <button onClick={handleSave} disabled={saving} style={saveBtn}>
            {saving ? "Guardando…" : quizId ? "Guardar cambios" : "Crear quiz"}
          </button>
        </div>
      </div>

      {/* ── Questions ── */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 16px 60px" }}>
        {questions.map((q, i) => (
          <QuestionCard
            key={q.id}
            question={q}
            index={i}
            total={questions.length}
            onChange={(updated) => updateQuestion(q.id, updated)}
            onRemove={() => removeQuestion(q.id)}
            onMove={(dir) => moveQuestion(q.id, dir)}
          />
        ))}

        {/* ── Add question ── */}
        <div style={addQuestionRow}>
          {Object.entries(QUESTION_TYPE_LABELS).map(([type, label]) => (
            <button
              key={type}
              onClick={() => addQuestion(type as QuestionType)}
              style={addQuestionBtn}
            >
              + {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  background: "#111",
  minHeight: "100vh",
  fontFamily: '"Geist", "Inter", ui-sans-serif, system-ui, sans-serif',
  color: "#EDEDED",
};

const headerBar: React.CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 100,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "14px 32px",
  background: "#161616",
  borderBottom: "1px solid #222",
};

const saveBtn: React.CSSProperties = {
  padding: "10px 22px",
  background: "#2D6A4F",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 14,
};

const savedBadge: React.CSSProperties = {
  fontSize: 13,
  color: "#68D391",
  background: "#1C3A2A",
  padding: "4px 10px",
  borderRadius: 6,
};

const errorBadge: React.CSSProperties = {
  fontSize: 13,
  color: "#FC8181",
  background: "#3D1515",
  padding: "4px 10px",
  borderRadius: 6,
  maxWidth: 300,
};

const loadingWrap: React.CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  justifyContent: "center",
  height: "60vh",
};

const spinnerStyle: React.CSSProperties = {
  width: 20,
  height: 20,
  borderRadius: "50%",
  border: "2px solid #333",
  borderTopColor: "#AFAFAF",
  animation: "spin 0.8s linear infinite",
};

const questionCard: React.CSSProperties = {
  background: "#191919",
  border: "1px solid #272727",
  borderRadius: 12,
  marginBottom: 16,
  overflow: "hidden",
};

const questionCardHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 16px",
  borderBottom: "1px solid #222",
  background: "#161616",
};

const questionNumber: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "#AFAFAF",
  background: "#2A2A2A",
  padding: "3px 8px",
  borderRadius: 6,
};

const typeSelect: React.CSSProperties = {
  background: "#1A1A1A",
  border: "1px solid #2D2D2D",
  borderRadius: 8,
  color: "#EDEDED",
  padding: "6px 10px",
  fontSize: 13,
  cursor: "pointer",
};

const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  color: "#6B6B6B",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: 8,
  marginTop: 0,
};

const statementWrap: React.CSSProperties = {
  border: "1px solid #272727",
  borderRadius: 8,
  padding: "8px 12px",
  background: "#141414",
  minHeight: 60,
};

const optionRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "flex-start",
  marginBottom: 10,
};

const optionEditorWrap: React.CSSProperties = {
  border: "1px solid #272727",
  borderRadius: 8,
  padding: "4px 12px",
  background: "#141414",
  minHeight: 40,
};

const optionIndex: React.CSSProperties = {
  fontSize: 12,
  color: "#555",
  display: "block",
  marginBottom: 2,
};

const correctToggle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 6,
  border: "1px solid #2D2D2D",
  cursor: "pointer",
  fontSize: 14,
  flexShrink: 0,
  marginTop: 18,
};

const removeBtn: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: 4,
  border: "none",
  background: "transparent",
  color: "#555",
  cursor: "pointer",
  fontSize: 12,
  flexShrink: 0,
};

const removeBtnRed: React.CSSProperties = {
  padding: "5px 12px",
  background: "transparent",
  border: "1px solid #5a2020",
  color: "#FC8181",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 12,
};

const collapseBtn: React.CSSProperties = {
  padding: "5px 12px",
  background: "transparent",
  border: "1px solid #2D2D2D",
  color: "#AFAFAF",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 12,
};

const addOptionBtn: React.CSSProperties = {
  background: "transparent",
  border: "1px dashed #2D2D2D",
  color: "#6B6B6B",
  padding: "7px 14px",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 13,
  marginTop: 6,
};

const arrowBtn: React.CSSProperties = {
  background: "transparent",
  border: "1px solid #2D2D2D",
  color: "#AFAFAF",
  borderRadius: 4,
  cursor: "pointer",
  padding: "2px 6px",
  fontSize: 10,
};

const sortPositionBadge: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 6,
  background: "#1A1A1A",
  border: "1px solid #2D2D2D",
  color: "#AFAFAF",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 13,
  fontWeight: 700,
  flexShrink: 0,
  marginTop: 18,
};

// Matching styles
const matchingColWrap: React.CSSProperties = {
  flex: "1 1 200px",
  minWidth: 0,
  background: "#141414",
  border: "1px solid #272727",
  borderRadius: 10,
  padding: 12,
};

const matchingColHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 10,
};

const addColumnBtn: React.CSSProperties = {
  alignSelf: "flex-start",
  padding: "8px 14px",
  background: "transparent",
  border: "1px dashed #2D2D2D",
  color: "#6B6B6B",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 13,
};

const matchingTable: React.CSSProperties = {
  borderCollapse: "collapse",
  width: "100%",
  fontSize: 13,
};

const matchingTh: React.CSSProperties = {
  padding: "8px 12px",
  textAlign: "left",
  color: "#6B6B6B",
  borderBottom: "1px solid #272727",
  fontWeight: 600,
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const matchingTd: React.CSSProperties = {
  padding: "8px 12px",
  borderBottom: "1px solid #1e1e1e",
  verticalAlign: "middle",
};

const matchingSelect: React.CSSProperties = {
  background: "#1A1A1A",
  border: "1px solid #2D2D2D",
  borderRadius: 6,
  color: "#EDEDED",
  padding: "6px 10px",
  fontSize: 13,
  cursor: "pointer",
  width: "100%",
};

const addQuestionRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 8,
  paddingTop: 16,
  borderTop: "1px dashed #222",
};

const addQuestionBtn: React.CSSProperties = {
  padding: "9px 16px",
  background: "#1A1A1A",
  border: "1px solid #2D2D2D",
  color: "#AFAFAF",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 13,
};
