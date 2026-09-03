// src/pages/admin/events/EventMetricsPDF.tsx
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import {
  EventMetrics,
  QuizMetrics,
} from "../../../services/eventMetricsService";
import {
  formatDate,
  formatDuration,
  formatMonth,
  formatNumber,
  hiddenQuizzesNote,
  percent,
  splitEnabledQuizzes,
} from "./eventMetricsFormat";

// ── Paleta ────────────────────────────────────────────────────────────────

const C = {
  blue: "#2a78d6",
  blueTrack: "#dbe9fa",
  green: "#2f9e44",
  orange: "#e67700",
  red: "#c92a2a",
  border: "#dee2e6",
  lightGray: "#f1f3f5",
  text: "#212529",
  dimmed: "#868e96",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 8,
    color: C.text,
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 36,
  },
  // ── Encabezado ──
  header: { marginBottom: 16 },
  title: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: C.blue,
    marginBottom: 2,
  },
  subtitle: { fontSize: 8, color: C.dimmed },
  // ── Secciones ──
  section: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.dimmed,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingBottom: 2,
  },
  sectionNote: { fontSize: 6.5, color: C.dimmed, marginBottom: 6 },
  // ── Tarjetas de KPI ──
  row: { flexDirection: "row", gap: 8, marginBottom: 8 },
  statBox: {
    flex: 1,
    backgroundColor: C.lightGray,
    borderRadius: 4,
    padding: 8,
  },
  statLabel: {
    fontSize: 6.5,
    color: C.dimmed,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  statValue: { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 1 },
  statDesc: { fontSize: 6, color: C.dimmed },
  // ── Barras ──
  barRow: { flexDirection: "row", alignItems: "center", marginBottom: 3 },
  barLabel: { fontSize: 6.5, color: C.text, width: 52 },
  barTrack: {
    flex: 1,
    height: 7,
    borderRadius: 2,
    backgroundColor: C.blueTrack,
  },
  barFill: { height: 7, borderRadius: 2, backgroundColor: C.blue },
  barValue: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: C.text,
    width: 34,
    textAlign: "right",
  },
  // ── Tabla ──
  tableHead: {
    flexDirection: "row",
    backgroundColor: C.lightGray,
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderRadius: 2,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  th: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: C.dimmed,
    textTransform: "uppercase",
  },
  td: { fontSize: 7, color: C.text },
  moduleRow: { marginTop: 6, marginBottom: 2, paddingHorizontal: 4 },
  moduleName: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: C.dimmed,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  // ── Utilidades ──
  divider: {
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    marginVertical: 10,
  },
  empty: { fontSize: 7, color: C.dimmed },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 6, color: C.dimmed },
  demoBanner: {
    backgroundColor: "#fff9db",
    borderRadius: 4,
    padding: 6,
    marginBottom: 10,
  },
  demoText: { fontSize: 7, color: C.orange, fontFamily: "Helvetica-Bold" },
});

// ── Anchos de la tabla de actividades ─────────────────────────────────────

const COL = {
  name: { flex: 1 },
  attendees: { width: 52, textAlign: "right" as const },
  completed: { width: 62, textAlign: "right" as const },
  rate: { width: 46, textAlign: "right" as const },
  progress: { width: 52, textAlign: "right" as const },
  time: { width: 62, textAlign: "right" as const },
};

// ── Anchos de la tabla de exámenes ────────────────────────────────────────

const QUIZ_COL = {
  name: { flex: 1 },
  attempts: { width: 42, textAlign: "right" as const },
  users: { width: 42, textAlign: "right" as const },
  score: { width: 46, textAlign: "right" as const },
  passing: { width: 42, textAlign: "right" as const },
  approval: { width: 62, textAlign: "right" as const },
  pending: { width: 42, textAlign: "right" as const },
  review: { width: 42, textAlign: "right" as const },
};

/**
 * Nombre legible de un examen, con la misma terminología del gestor de
 * exámenes. Se decide por `moduleId`: un examen de un módulo ya borrado llega
 * sin `moduleName` y no debe confundirse con el examen general.
 */
function quizLabel(quiz: QuizMetrics): string {
  if (quiz.legacy) return "Examen sin identificar";
  if (quiz.moduleId === null) return "General del curso";
  return quiz.moduleName ? `Módulo: ${quiz.moduleName}` : "Módulo eliminado";
}

/** % de usuarios calificados que aprobaron, con el detalle del cociente. */
function approvalOf(quiz: QuizMetrics): string {
  if (quiz.passedUsers === null || quiz.gradedUsers === 0) return "—";
  return `${percent(quiz.passedUsers, quiz.gradedUsers)}% (${formatNumber(
    quiz.passedUsers
  )}/${formatNumber(quiz.gradedUsers)})`;
}

// ── Sub-componentes ───────────────────────────────────────────────────────

function StatRow({
  items,
}: {
  items: { label: string; value: string; desc?: string; color?: string }[];
}) {
  return (
    <View style={styles.row}>
      {items.map((item, i) => (
        <View key={i} style={styles.statBox}>
          <Text style={styles.statLabel}>{item.label}</Text>
          <Text
            style={[styles.statValue, item.color ? { color: item.color } : {}]}
          >
            {item.value}
          </Text>
          {item.desc && <Text style={styles.statDesc}>{item.desc}</Text>}
        </View>
      ))}
    </View>
  );
}

function BarRow({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const width = max > 0 ? Math.max((value / max) * 100, value > 0 ? 2 : 0) : 0;
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${width}%` }]} />
      </View>
      <Text style={styles.barValue}>{formatNumber(value)}</Text>
    </View>
  );
}

function ReportFooter({
  organizationName,
  eventName,
}: {
  organizationName?: string | null;
  eventName: string;
}) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>
        {organizationName ?? "GenCampus"} · Métricas de {eventName}
      </Text>
      <Text
        style={styles.footerText}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}

// ── Documento ─────────────────────────────────────────────────────────────

interface Props {
  metrics: EventMetrics;
  organizationName?: string | null;
  /** true cuando la pestaña está mostrando datos de ejemplo */
  demo?: boolean;
}

export function EventMetricsPDF({ metrics, organizationName, demo }: Props) {
  const { event, enrollment, time, activities, quizzes, certificates } =
    metrics;

  const generatedAt = new Date().toLocaleString("es-CO", {
    dateStyle: "long",
    timeStyle: "short",
  });
  const completionRate = percent(enrollment.completed, enrollment.total);
  // El informe solo reporta exámenes habilitados (ver splitEnabledQuizzes).
  const { enabled: enabledQuizzes, hiddenCount: hiddenQuizzes } =
    splitEnabledQuizzes(quizzes);
  const maxMonth = enrollment.byMonth.reduce(
    (max, m) => Math.max(max, m.count),
    0
  );
  let lastModule: string | null = null;

  return (
    <Document
      title={`Métricas — ${event.name}`}
      author={organizationName ?? "GenCampus"}
    >
      {/* ── Página 1: resumen ─────────────────────────────────────────── */}
      <Page size="A4" style={styles.page} orientation="portrait">
        <View style={styles.header}>
          <Text style={styles.title}>{event.name}</Text>
          <Text style={styles.subtitle}>
            Informe de métricas del curso
            {organizationName ? ` · ${organizationName}` : ""} · Generado:{" "}
            {generatedAt}
          </Text>
          <Text style={styles.subtitle}>
            Fechas del curso: {formatDate(event.datetime_from)} —{" "}
            {formatDate(event.datetime_to)}
          </Text>
        </View>

        {demo && (
          <View style={styles.demoBanner}>
            <Text style={styles.demoText}>
              Datos de ejemplo — este informe no refleja la actividad real del
              curso.
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen</Text>
          <StatRow
            items={[
              {
                label: "Inscritos",
                value: formatNumber(enrollment.total),
                desc: `${formatNumber(
                  enrollment.notStarted
                )} sin empezar · ${formatNumber(enrollment.inProgress)} en progreso`,
              },
              {
                label: "Completaron el curso",
                value: `${completionRate}%`,
                color: C.green,
                desc: `${formatNumber(enrollment.completed)} de ${formatNumber(
                  enrollment.total
                )} inscritos`,
              },
              {
                label: "Progreso promedio",
                value: `${enrollment.avgProgress}%`,
                color: C.blue,
              },
              {
                label: "Tiempo prom. por usuario",
                value: formatDuration(time.avgPerUserMs),
                desc: `${formatDuration(time.totalMs)} en total · ${formatNumber(
                  time.usersWithTime
                )} usuarios`,
              },
            ]}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Inscripciones por mes</Text>
          <Text style={styles.sectionNote}>
            Nuevos inscritos según su fecha de inscripción
          </Text>
          {enrollment.byMonth.length === 0 ? (
            <Text style={styles.empty}>
              Aún no hay inscripciones registradas.
            </Text>
          ) : (
            enrollment.byMonth.map((m) => (
              <BarRow
                key={m.month}
                label={formatMonth(m.month)}
                value={m.count}
                max={maxMonth}
              />
            ))
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exámenes</Text>
          <Text style={styles.sectionNote}>
            Un curso puede tener un examen general y uno por módulo; cada fila
            es un examen distinto y habilitado. La nota es el mejor intento de
            cada usuario.
          </Text>
          {enabledQuizzes.some((q) => q.legacy) && (
            <View style={styles.demoBanner}>
              <Text style={styles.demoText}>
                El servidor devolvió un único examen sin identificar: este
                curso puede tener más exámenes que no aparecen aquí.
              </Text>
            </View>
          )}
          {quizzes.length === 0 ? (
            <Text style={styles.empty}>
              Este curso no tiene exámenes configurados.
            </Text>
          ) : enabledQuizzes.length === 0 ? (
            <Text style={styles.empty}>
              Todos los exámenes de este curso están deshabilitados.
            </Text>
          ) : (
            <View>
              <View style={styles.tableHead}>
                <Text style={[styles.th, QUIZ_COL.name]}>Examen</Text>
                <Text style={[styles.th, QUIZ_COL.attempts]}>Intentos</Text>
                <Text style={[styles.th, QUIZ_COL.users]}>Usuarios</Text>
                <Text style={[styles.th, QUIZ_COL.score]}>Nota prom.</Text>
                <Text style={[styles.th, QUIZ_COL.passing]}>Nota mín.</Text>
                <Text style={[styles.th, QUIZ_COL.approval]}>Aprobación</Text>
                <Text style={[styles.th, QUIZ_COL.pending]}>Sin calif.</Text>
                <Text style={[styles.th, QUIZ_COL.review]}>Revisión</Text>
              </View>
              {enabledQuizzes.map((q) => (
                <View key={q.quizId} style={styles.tableRow} wrap={false}>
                  <Text style={[styles.td, QUIZ_COL.name]}>{quizLabel(q)}</Text>
                  <Text style={[styles.td, QUIZ_COL.attempts]}>
                    {formatNumber(q.totalAttempts)}
                  </Text>
                  <Text style={[styles.td, QUIZ_COL.users]}>
                    {formatNumber(q.uniqueUsers)}
                  </Text>
                  <Text style={[styles.td, QUIZ_COL.score]}>
                    {q.avgBestScore !== null ? q.avgBestScore : "—"}
                  </Text>
                  <Text style={[styles.td, QUIZ_COL.passing]}>
                    {q.passingScore !== null ? q.passingScore : "—"}
                  </Text>
                  <Text style={[styles.td, QUIZ_COL.approval]}>
                    {approvalOf(q)}
                  </Text>
                  <Text style={[styles.td, QUIZ_COL.pending]}>
                    {formatNumber(q.pending)}
                  </Text>
                  <Text style={[styles.td, QUIZ_COL.review]}>
                    {formatNumber(q.review)}
                  </Text>
                </View>
              ))}
              {hiddenQuizzes > 0 && (
                <Text style={[styles.sectionNote, { marginTop: 4 }]}>
                  {hiddenQuizzesNote(hiddenQuizzes)}
                </Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Certificados</Text>
          <StatRow
            items={[
              {
                label: "Generados",
                value: formatNumber(certificates.completed),
                color: C.green,
                desc: `${formatNumber(certificates.total)} solicitados`,
              },
              {
                label: "Pendientes",
                value: formatNumber(certificates.pending),
                color: C.orange,
              },
              {
                label: "Fallidos",
                value: formatNumber(certificates.failed),
                color: C.red,
              },
            ]}
          />
        </View>

        <ReportFooter
          organizationName={organizationName}
          eventName={event.name}
        />
      </Page>

      {/* ── Página 2: detalle por actividad ───────────────────────────── */}
      <Page size="A4" style={styles.page} orientation="portrait">
        <View style={styles.header}>
          <Text style={styles.title}>Avance por actividad</Text>
          <Text style={styles.subtitle}>
            {event.name}
            {organizationName ? ` · ${organizationName}` : ""}
          </Text>
          <Text style={styles.subtitle}>
            «Completaron» se calcula sobre los usuarios que iniciaron cada
            actividad.
          </Text>
        </View>

        {activities.length === 0 ? (
          <Text style={styles.empty}>Este curso aún no tiene actividades.</Text>
        ) : (
          <View>
            <View style={styles.tableHead} fixed>
              <Text style={[styles.th, COL.name]}>Actividad</Text>
              <Text style={[styles.th, COL.attendees]}>Iniciaron</Text>
              <Text style={[styles.th, COL.completed]}>Completaron</Text>
              <Text style={[styles.th, COL.rate]}>%</Text>
              <Text style={[styles.th, COL.progress]}>Prog. prom.</Text>
              <Text style={[styles.th, COL.time]}>Tiempo total</Text>
            </View>

            {activities.map((activity) => {
              const showModule =
                !!activity.moduleName && activity.moduleName !== lastModule;
              lastModule = activity.moduleName ?? lastModule;

              return (
                <View key={activity.activityId} wrap={false}>
                  {showModule && (
                    <View style={styles.moduleRow}>
                      <Text style={styles.moduleName}>
                        {activity.moduleName}
                      </Text>
                    </View>
                  )}
                  <View style={styles.tableRow}>
                    <Text style={[styles.td, COL.name]}>{activity.name}</Text>
                    <Text style={[styles.td, COL.attendees]}>
                      {formatNumber(activity.attendees)}
                    </Text>
                    <Text style={[styles.td, COL.completed]}>
                      {formatNumber(activity.completed)}
                    </Text>
                    <Text style={[styles.td, COL.rate]}>
                      {percent(activity.completed, activity.attendees)}%
                    </Text>
                    <Text style={[styles.td, COL.progress]}>
                      {activity.avgProgress}%
                    </Text>
                    <Text style={[styles.td, COL.time]}>
                      {formatDuration(activity.totalTimeMs)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <ReportFooter
          organizationName={organizationName}
          eventName={event.name}
        />
      </Page>
    </Document>
  );
}
