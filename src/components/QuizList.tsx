// @ts-nocheck
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  getQuizByEventId,
  UserAttempt,
  Quiz,
  Question,
  UserAnswer,
  EditorBlock,
} from "../services/quizService";
import { fetchUserById } from "../services/userService";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface AttemptRow {
  userId: string;
  names: string;
  bestScore: number;
  bestAttemptedAt: string;
  totalAttempts: number;
  bestUserAnswers: UserAnswer[];
}

interface QuizListProps {
  eventId: string;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 80) return "#68D391";
  if (score >= 50) return "#F6AD55";
  return "#FC8181";
}

function scoreBg(score: number): string {
  if (score >= 80) return "#1C3A2A";
  if (score >= 50) return "#3A2A10";
  return "#3D1515";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Extrae texto plano de una lista de EditorBlock */
function blocksToText(blocks: EditorBlock[]): string {
  return (blocks ?? []).map((b) => b.content).join(" ").trim();
}

// ─────────────────────────────────────────────
// Sub-componente: panel de respuestas de un intento
// ─────────────────────────────────────────────

function AttemptAnswersPanel({
  userAnswers,
  questions,
}: {
  userAnswers: UserAnswer[];
  questions: Question[];
}) {
  // Mapa de questionId → UserAnswer para acceso rápido
  const answerMap: Record<string, UserAnswer> = {};
  (userAnswers ?? []).forEach((ua) => {
    answerMap[ua.questionId] = ua;
  });

  return (
    <div style={answersPanelStyle}>
      {questions.map((q, i) => {
        const userAnswer = answerMap[q.id];
        const qText = blocksToText(q.blocks) || `Pregunta ${i + 1}`;

        return (
          <div key={q.id} style={questionBlockStyle}>
            {/* Número + enunciado */}
            <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <span style={questionNumStyle}>{i + 1}</span>
              <span style={{ fontSize: 12, color: "#CDCDCD", flex: 1 }}>{qText}</span>
            </div>

            {/* Respuesta del usuario */}
            {!userAnswer ? (
              <span style={{ fontSize: 11, color: "#555" }}>Sin respuesta</span>
            ) : q.type === "single" ? (
              // single → string = option id
              renderSingleAnswer(q, userAnswer.answer as string)
            ) : q.type === "multiple" ? (
              // multiple → string[]
              renderMultipleAnswer(q, userAnswer.answer as string[])
            ) : q.type === "sorting" ? (
              // sorting → string[]
              renderSortingAnswer(q, userAnswer.answer as string[])
            ) : q.type === "matching" ? (
              // matching → MatchingAnswer[]
              renderMatchingAnswer(q, userAnswer.answer as any[])
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// Renderers de respuesta por tipo
// ─────────────────────────────────────────────

function renderSingleAnswer(q: Question, selectedId: string) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {(q.options ?? []).map((opt) => {
        const isSelected = opt.id === selectedId;
        const isCorrect = opt.id === q.correctAnswer;
        const text = blocksToText(opt.blocks) || "(sin texto)";
        let bg = "transparent";
        let border = "1px solid #2a2a2a";
        let color = "#666";
        if (isSelected && isCorrect) { bg = "#1C3A2A"; border = "1px solid #68D391"; color = "#68D391"; }
        else if (isSelected && !isCorrect) { bg = "#3D1515"; border = "1px solid #FC8181"; color = "#FC8181"; }
        else if (!isSelected && isCorrect) { bg = "#162C1D"; border = "1px dashed #68D391"; color = "#68D391"; }
        return (
          <div key={opt.id} style={{ ...optionRowStyle, background: bg, border, color }}>
            <span style={{ marginRight: 6 }}>
              {isSelected ? (isCorrect ? "✓" : "✗") : isCorrect ? "○" : "·"}
            </span>
            {text}
          </div>
        );
      })}
    </div>
  );
}

function renderMultipleAnswer(q: Question, selectedIds: string[]) {
  const sel = selectedIds ?? [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {(q.options ?? []).map((opt) => {
        const isSelected = sel.includes(opt.id);
        const isCorrect = (q.correctAnswers ?? []).includes(opt.id);
        const text = blocksToText(opt.blocks) || "(sin texto)";
        let bg = "transparent";
        let border = "1px solid #2a2a2a";
        let color = "#666";
        if (isSelected && isCorrect) { bg = "#1C3A2A"; border = "1px solid #68D391"; color = "#68D391"; }
        else if (isSelected && !isCorrect) { bg = "#3D1515"; border = "1px solid #FC8181"; color = "#FC8181"; }
        else if (!isSelected && isCorrect) { bg = "#162C1D"; border = "1px dashed #68D391"; color = "#68D391"; }
        return (
          <div key={opt.id} style={{ ...optionRowStyle, background: bg, border, color }}>
            <span style={{ marginRight: 6 }}>
              {isSelected ? (isCorrect ? "✓" : "✗") : isCorrect ? "○" : "·"}
            </span>
            {text}
          </div>
        );
      })}
    </div>
  );
}

function renderSortingAnswer(q: Question, userOrder: string[]) {
  const order = (userOrder ?? []).length > 0 ? userOrder : (q.options ?? []).map((o) => o.id);
  const correct = q.correctOrder ?? [];
  const optMap = Object.fromEntries((q.options ?? []).map((o) => [o.id, blocksToText(o.blocks)]));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {order.map((id, i) => {
        const isCorrectPos = correct[i] === id;
        return (
          <div
            key={id}
            style={{
              ...optionRowStyle,
              background: isCorrectPos ? "#1C3A2A" : "#3D1515",
              border: isCorrectPos ? "1px solid #68D391" : "1px solid #FC8181",
              color: isCorrectPos ? "#68D391" : "#FC8181",
            }}
          >
            <span style={{ marginRight: 8, fontWeight: 700, fontSize: 10, opacity: 0.7 }}>
              {i + 1}
            </span>
            {optMap[id] || id}
          </div>
        );
      })}
    </div>
  );
}

function renderMatchingAnswer(q: Question, matchingAnswers: any[]) {
  return <MatchingAnswerView q={q} matchingAnswers={matchingAnswers} />;
}

function MatchingAnswerView({ q, matchingAnswers }: { q: Question; matchingAnswers: any[] }) {
  const colA = (q.columns ?? []).find((c) => c.label === "A");
  const otherCols = (q.columns ?? []).filter((c) => c.label !== "A");

  const optTextMap: Record<string, string> = {};
  (q.columns ?? []).forEach((col) => {
    col.options.forEach((opt) => {
      optTextMap[opt.id] = blocksToText(opt.blocks) || "(sin texto)";
    });
  });

  // matchMap: columnAId → { colLabel → selectedId }
  const matchMap: Record<string, Record<string, string>> = {};
  (matchingAnswers ?? []).forEach((ma: any) => {
    matchMap[ma.columnAId] = ma.matches ?? {};
  });

  // correctMap: columnAId → { colLabel → correctId }
  const correctMap: Record<string, Record<string, string>> = {};
  (q.matchingAnswers ?? []).forEach((ma: any) => {
    correctMap[ma.columnAId] = ma.matches ?? {};
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {otherCols.map((colB) => (
        <MatchingColumnPair
          key={colB.label}
          colAOptions={colA?.options ?? []}
          colBOptions={colB.options}
          colBLabel={colB.label}
          matchMap={matchMap}
          correctMap={correctMap}
          optTextMap={optTextMap}
        />
      ))}
    </div>
  );
}

function MatchingColumnPair({
  colAOptions,
  colBOptions,
  colBLabel,
  matchMap,
  correctMap,
  optTextMap,
}: {
  colAOptions: any[];
  colBOptions: any[];
  colBLabel: string;
  matchMap: Record<string, Record<string, string>>;
  correctMap: Record<string, Record<string, string>>;
  optTextMap: Record<string, string>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const aRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const bRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [, forceUpdate] = useState(0);

  useLayoutEffect(() => {
    forceUpdate((n) => n + 1);
  }, [matchMap, colAOptions, colBOptions]);

  useEffect(() => {
    const obs = new ResizeObserver(() => forceUpdate((n) => n + 1));
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const getCenter = (el: HTMLDivElement | null, container: HTMLDivElement | null, side: "right" | "left") => {
    if (!el || !container) return null;
    const er = el.getBoundingClientRect();
    const cr = container.getBoundingClientRect();
    return {
      x: side === "right" ? er.right - cr.left : er.left - cr.left,
      y: er.top - cr.top + er.height / 2,
    };
  };

  // Construye líneas a dibujar
  type Line = { aId: string; bId: string; correct: boolean; x1: number; y1: number; x2: number; y2: number };
  const lines: Line[] = [];

  colAOptions.forEach((aOpt) => {
    const selectedBId = matchMap[aOpt.id]?.[colBLabel];
    if (!selectedBId) return;
    const correctBId = correctMap[aOpt.id]?.[colBLabel];
    const isCorrect = selectedBId === correctBId;
    const a = getCenter(aRefs.current[aOpt.id], containerRef.current, "right");
    const b = getCenter(bRefs.current[selectedBId], containerRef.current, "left");
    if (a && b) lines.push({ aId: aOpt.id, bId: selectedBId, correct: isCorrect, x1: a.x, y1: a.y, x2: b.x, y2: b.y });
  });

  // IDs involucrados en líneas
  const connectedAIds = new Set(lines.map((l) => l.aId));
  const connectedBIds = new Set(lines.map((l) => l.bId));

  const itemStyle = (connected: boolean, correct: boolean | null): React.CSSProperties => ({
    padding: "5px 10px",
    borderRadius: 6,
    fontSize: 11,
    marginBottom: 6,
    border: !connected
      ? "1px solid #2a2a2a"
      : correct
      ? "1px solid #68D391"
      : "1px solid #FC8181",
    background: !connected
      ? "transparent"
      : correct
      ? "#162C1D"
      : "#3D1515",
    color: !connected ? "#555" : correct ? "#68D391" : "#FC8181",
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
  });

  return (
    <div>
      {colBLabel !== "B" && (
        <span style={{ fontSize: 10, color: "#555", marginBottom: 4, display: "block" }}>
          Columna {colBLabel}
        </span>
      )}
      <div ref={containerRef} style={{ position: "relative", display: "flex", gap: 0, alignItems: "flex-start" }}>
        {/* SVG líneas */}
        <svg
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            overflow: "visible",
            zIndex: 1,
          }}
        >
          {lines.map((l) => (
            <line
              key={`${l.aId}-${l.bId}`}
              x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              stroke={l.correct ? "#68D391" : "#FC8181"}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeDasharray={l.correct ? "none" : "4 3"}
              opacity={0.7}
            />
          ))}
        </svg>

        {/* Columna A */}
        <div style={{ flex: 1, zIndex: 2 }}>
          {colAOptions.map((opt) => {
            const line = lines.find((l) => l.aId === opt.id);
            const connected = connectedAIds.has(opt.id);
            return (
              <div
                key={opt.id}
                ref={(el) => { aRefs.current[opt.id] = el; }}
                style={itemStyle(connected, line?.correct ?? null)}
              >
                {optTextMap[opt.id]}
              </div>
            );
          })}
        </div>

        {/* Espacio central */}
        <div style={{ minWidth: 48, flexShrink: 0 }} />

        {/* Columna B */}
        <div style={{ flex: 1, zIndex: 2 }}>
          {colBOptions.map((opt) => {
            const line = lines.find((l) => l.bId === opt.id);
            const connected = connectedBIds.has(opt.id);
            return (
              <div
                key={opt.id}
                ref={(el) => { bRefs.current[opt.id] = el; }}
                style={itemStyle(connected, line?.correct ?? null)}
              >
                {optTextMap[opt.id]}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────

export default function QuizList({ eventId }: QuizListProps) {
  const [rows, setRows] = useState<AttemptRow[]>([]);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // userId expandido (null = ninguno)
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const quizData = await getQuizByEventId(eventId);

        if (!quizData || quizData.listUserAttempts.length === 0) {
          setRows([]);
          return;
        }

        setQuiz(quizData);

        // Agrupar todos los intentos por userId
        const byUser: Record<string, UserAttempt[]> = {};
        for (const attempt of quizData.listUserAttempts) {
          if (!byUser[attempt.userId]) byUser[attempt.userId] = [];
          byUser[attempt.userId].push(attempt);
        }

        // Por cada usuario único: mejor intento + total de intentos
        const uniqueUsers = Object.entries(byUser).map(([userId, attempts]) => {
          const best = attempts.reduce((b, a) => (a.score > b.score ? a : b));
          return { userId, best, totalAttempts: attempts.length };
        });

        const settled = await Promise.allSettled(
          uniqueUsers.map(({ userId, best, totalAttempts }) =>
            fetchUserById(userId).then((user) => ({
              userId,
              names: user.names ?? "Usuario desconocido",
              bestScore: best.score,
              bestAttemptedAt: best.attemptedAt,
              totalAttempts,
              bestUserAnswers: best.userAnswers ?? [],
            })),
          ),
        );

        const resolved: AttemptRow[] = settled.map((result, i) => {
          if (result.status === "fulfilled") return result.value;
          const { userId, best, totalAttempts } = uniqueUsers[i];
          return {
            userId,
            names: "Usuario desconocido",
            bestScore: best.score,
            bestAttemptedAt: best.attemptedAt,
            totalAttempts,
            bestUserAnswers: best.userAnswers ?? [],
          };
        });

        resolved.sort((a, b) => b.bestScore - a.bestScore);
        setRows(resolved);
      } catch (e: any) {
        setError(e?.response?.data?.message ?? "Error al cargar los resultados.");
      } finally {
        setLoading(false);
      }
    })();
  }, [eventId]);

  const toggleExpand = (userId: string) => {
    setExpandedUserId((prev) => (prev === userId ? null : userId));
  };

  if (loading) {
    return (
      <div style={wrapStyle}>
        <style>{spinKeyframe}</style>
        <div style={centerStyle}>
          <div style={spinnerStyle} />
          <span style={mutedText}>Cargando resultados…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={wrapStyle}>
        <div style={centerStyle}>
          <span style={{ color: "#FC8181", fontSize: 14 }}>{error}</span>
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div style={wrapStyle}>
        <div style={centerStyle}>
          <span style={{ fontSize: 32, marginBottom: 12 }}>📭</span>
          <span style={mutedText}>Nadie ha realizado el quiz todavía.</span>
        </div>
      </div>
    );
  }

  const avg = Math.round(rows.reduce((s, r) => s + r.bestScore, 0) / rows.length);

  return (
    <div style={wrapStyle}>
      <style>{spinKeyframe}</style>

      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h2 style={titleStyle}>Resultados del Quiz</h2>
          <p style={subtitleStyle}>
            {rows.length} {rows.length === 1 ? "participante" : "participantes"}
          </p>
        </div>
        <div style={avgBadge}>
          <span style={{ fontSize: 11, color: "#6B6B6B", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Promedio
          </span>
          <span style={{ fontSize: 26, fontWeight: 700, color: scoreColor(avg) }}>
            {avg}%
          </span>
        </div>
      </div>

      {/* Table */}
      <div style={tableWrap}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: 40 }}>#</th>
              <th style={thStyle}>Participante</th>
              <th style={{ ...thStyle, textAlign: "center" }}>Mejor nota</th>
              <th style={{ ...thStyle, textAlign: "center" }}>Intentos</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Último intento</th>
              <th style={{ ...thStyle, width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const isExpanded = expandedUserId === row.userId;
              return (
                <React.Fragment key={row.userId}>
                  <tr
                    style={{ ...trStyle, cursor: "pointer" }}
                    onClick={() => toggleExpand(row.userId)}
                  >
                    <td style={{ ...tdStyle, color: "#555", fontSize: 12 }}>{i + 1}</td>
                    <td style={tdStyle}>
                      <div style={nameCell}>
                        <div style={avatarStyle}>{row.names.charAt(0).toUpperCase()}</div>
                        <span style={{ color: "#EDEDED", fontSize: 14 }}>{row.names}</span>
                      </div>
                    </td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      <span
                        style={{
                          ...scorePill,
                          color: scoreColor(row.bestScore),
                          background: scoreBg(row.bestScore),
                          border: `1px solid ${scoreColor(row.bestScore)}33`,
                        }}
                      >
                        {row.bestScore}%
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      <span style={{
                        fontSize: 12,
                        color: "#AFAFAF",
                        background: "#1e1e1e",
                        border: "1px solid #2a2a2a",
                        borderRadius: 12,
                        padding: "2px 10px",
                      }}>
                        {row.totalAttempts}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", color: "#555", fontSize: 12 }}>
                      {formatDate(row.bestAttemptedAt)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      <span style={{ fontSize: 10, color: "#555", userSelect: "none" }}>
                        {isExpanded ? "▲" : "▼"}
                      </span>
                    </td>
                  </tr>

                  {/* Panel de respuestas expandible */}
                  {isExpanded && quiz && (
                    <tr>
                      <td colSpan={6} style={{ padding: 0, borderBottom: "1px solid #161616" }}>
                        <AttemptAnswersPanel
                          userAnswers={row.bestUserAnswers}
                          questions={quiz.questions}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const spinKeyframe = `@keyframes spin { to { transform: rotate(360deg); } }`;

const wrapStyle: React.CSSProperties = {
  background: "#111",
  borderRadius: 12,
  border: "1px solid #1e1e1e",
  overflow: "hidden",
  fontFamily: '"Geist", "Inter", ui-sans-serif, system-ui, sans-serif',
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  padding: "20px 24px 16px",
  borderBottom: "1px solid #1e1e1e",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 18,
  fontWeight: 700,
  color: "#EDEDED",
};

const subtitleStyle: React.CSSProperties = {
  margin: "4px 0 0",
  fontSize: 12,
  color: "#555",
};

const avgBadge: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: 2,
};

const tableWrap: React.CSSProperties = {
  overflowX: "auto",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
};

const thStyle: React.CSSProperties = {
  padding: "10px 16px",
  textAlign: "left",
  fontSize: 11,
  fontWeight: 600,
  color: "#555",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  borderBottom: "1px solid #1e1e1e",
  background: "#141414",
};

const trStyle: React.CSSProperties = {
  borderBottom: "1px solid #161616",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 16px",
  verticalAlign: "middle",
};

const nameCell: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const avatarStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: "50%",
  background: "#1e1e1e",
  border: "1px solid #2D2D2D",
  color: "#AFAFAF",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 13,
  fontWeight: 700,
  flexShrink: 0,
};

const scorePill: React.CSSProperties = {
  display: "inline-block",
  padding: "3px 10px",
  borderRadius: 20,
  fontSize: 13,
  fontWeight: 700,
};

const centerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "48px 24px",
};

const mutedText: React.CSSProperties = {
  color: "#555",
  fontSize: 14,
};

const spinnerStyle: React.CSSProperties = {
  width: 20,
  height: 20,
  borderRadius: "50%",
  border: "2px solid #1e1e1e",
  borderTopColor: "#AFAFAF",
  animation: "spin 0.8s linear infinite",
};

const answersPanelStyle: React.CSSProperties = {
  background: "#0D0D0D",
  borderTop: "1px solid #1e1e1e",
  padding: "16px 20px",
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const questionBlockStyle: React.CSSProperties = {
  paddingBottom: 12,
  borderBottom: "1px solid #1a1a1a",
};

const questionNumStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 18,
  height: 18,
  borderRadius: 4,
  background: "#222",
  color: "#777",
  fontSize: 10,
  fontWeight: 700,
  flexShrink: 0,
};

const optionRowStyle: React.CSSProperties = {
  padding: "4px 8px",
  borderRadius: 6,
  fontSize: 11,
  display: "flex",
  alignItems: "center",
};
