import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import {
  FullClassificationSummary,
  SubscriptionClassification,
} from "../../../services/paymentPlansService";

// ── Estilos ───────────────────────────────────────────────────────────────

const C = {
  blue: "#1971c2",
  green: "#2f9e44",
  teal: "#0c8599",
  yellow: "#e67700",
  violet: "#6741d9",
  orange: "#d9480f",
  red: "#c92a2a",
  gray: "#495057",
  lightGray: "#f1f3f5",
  border: "#dee2e6",
  text: "#212529",
  dimmed: "#868e96",
  white: "#ffffff",
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
  // ── Header ──
  header: { marginBottom: 16 },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", color: C.blue, marginBottom: 2 },
  subtitle: { fontSize: 8, color: C.dimmed },
  // ── Section ──
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
  // ── Stat grid ──
  row: { flexDirection: "row", gap: 8, marginBottom: 8 },
  statBox: {
    flex: 1,
    backgroundColor: C.lightGray,
    borderRadius: 4,
    padding: 8,
  },
  statLabel: { fontSize: 6.5, color: C.dimmed, textTransform: "uppercase", marginBottom: 2 },
  statValue: { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 1 },
  statDesc: { fontSize: 6, color: C.dimmed },
  statPct: { fontSize: 6.5, color: C.dimmed },
  // ── Inline row ──
  inlineRow: { flexDirection: "row", gap: 4, alignItems: "center", marginBottom: 4 },
  dot: { width: 7, height: 7, borderRadius: 2 },
  // ── Badge ──
  badge: { borderRadius: 3, paddingVertical: 1, paddingHorizontal: 3 },
  badgeText: { fontSize: 6, fontFamily: "Helvetica-Bold", color: C.white },
  // ── Footer ──
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 6, color: C.dimmed },
  // ── Divider ──
  divider: { borderBottomWidth: 0.5, borderBottomColor: C.border, marginVertical: 10 },
  // ── Verify row ──
  verifyRow: {
    flexDirection: "row",
    gap: 6,
    padding: 6,
    backgroundColor: "#e7f5ff",
    borderRadius: 4,
    marginTop: 4,
  },
  verifyText: { fontSize: 6.5, color: C.blue },
});

// ── Helpers ───────────────────────────────────────────────────────────────

function pct(part: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

const CLASS_LABEL: Record<SubscriptionClassification, string> = {
  pagado_sin_renovar: "Pagó – sin renovar",
  pagado_renovado_pagando: "Pagó + renovó pagando",
  pagado_renovado_cortesia: "Pagó + renovó cortesía",
  cortesia_sin_renovar: "Cortesía – sin renovar",
  cortesia_renovada_pagando: "Cortesía + renovó pagando",
  cortesia_renovada_cortesia: "Cortesía + renovó cortesía",
  sin_plan: "Sin suscripción",
};

const CLASS_COLOR: Record<SubscriptionClassification, string> = {
  pagado_sin_renovar: C.blue,
  pagado_renovado_pagando: C.green,
  pagado_renovado_cortesia: C.teal,
  cortesia_sin_renovar: C.yellow,
  cortesia_renovada_pagando: C.violet,
  cortesia_renovada_cortesia: C.orange,
  sin_plan: C.red,
};

// ── Sub-componentes ───────────────────────────────────────────────────────

function StatRow({
  items,
}: {
  items: { label: string; value: number; total?: number; desc?: string; color?: string }[];
}) {
  return (
    <View style={styles.row}>
      {items.map((item, i) => (
        <View key={i} style={styles.statBox}>
          <Text style={styles.statLabel}>{item.label}</Text>
          <Text style={[styles.statValue, item.color ? { color: item.color } : {}]}>
            {item.value.toLocaleString("es-CO")}
          </Text>
          {item.total !== undefined && (
            <Text style={styles.statPct}>{pct(item.value, item.total)}</Text>
          )}
          {item.desc && <Text style={styles.statDesc}>{item.desc}</Text>}
        </View>
      ))}
    </View>
  );
}

function LegendRow({
  color,
  label,
  value,
  total,
}: {
  color: string;
  label: string;
  value: number;
  total: number;
}) {
  return (
    <View style={styles.inlineRow}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={{ fontSize: 7, color: C.text, width: 48, fontFamily: "Helvetica-Bold" }}>
        {value.toLocaleString("es-CO")}
      </Text>
      <Text style={{ fontSize: 6.5, color: C.dimmed, flex: 1 }}>
        {label} ({pct(value, total)})
      </Text>
    </View>
  );
}

// ── Documento PDF ─────────────────────────────────────────────────────────

interface Props {
  summary: FullClassificationSummary;
  organizationId: string;
}

export function ClassificationReportPDF({ summary, organizationId }: Props) {
  const generatedAt = new Date(summary.generatedAt).toLocaleString("es-CO", {
    dateStyle: "long",
    timeStyle: "short",
  });

  return (
    <Document title="Clasificación de Suscripciones" author="GenCampus">
      {/* ── Página 1: Resumen ─────────────────────────────────────────── */}
      <Page size="A4" style={styles.page} orientation="portrait">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Clasificación Unificada de Suscripciones</Text>
          <Text style={styles.subtitle}>
            Org: {organizationId} · Generado: {generatedAt} · Datos Wompi desde ene 2023
          </Text>
        </View>

        {/* NIVEL 1: Totales generales */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Totales generales</Text>
          <StatRow
            items={[
              { label: "Total registrados", value: summary.total, color: C.gray },
              { label: "Activos", value: summary.totalActive, total: summary.total, color: C.green, desc: "Plan vigente hoy" },
              { label: "Vencidos", value: summary.totalExpired, total: summary.total, color: C.red, desc: "Plan expirado" },
              { label: "Sin suscripción", value: summary.sin_plan, total: summary.total, color: C.orange, desc: "Nunca tuvieron plan" },
            ]}
          />
        </View>

        <View style={styles.divider} />

        {/* NIVEL 2: Renovación sobre todos con plan */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Renovación — sobre los {summary.totalWithPlan.toLocaleString("es-CO")} con plan (activos + vencidos)
          </Text>
          <View style={styles.row}>
            {/* Renovados */}
            <View style={[styles.statBox, { flex: 1 }]}>
              <Text style={[styles.statLabel, { marginBottom: 4 }]}>Han renovado ≥1 vez — {summary.totalRenewed.toLocaleString("es-CO")} ({pct(summary.totalRenewed, summary.totalWithPlan)})</Text>
              <LegendRow color={C.blue}   label="Con pago Wompi" value={summary.totalRenewed_conWompi}  total={summary.totalRenewed} />
              <Text style={[styles.statDesc, { marginLeft: 14 }]}>Activos: {summary.renewedActive_conWompi.toLocaleString("es-CO")} · Vencidos: {summary.renewedExpired_conWompi.toLocaleString("es-CO")}</Text>
              <LegendRow color={C.yellow} label="Cortesía"        value={summary.totalRenewed_sinWompi}  total={summary.totalRenewed} />
              <Text style={[styles.statDesc, { marginLeft: 14 }]}>Activos: {summary.renewedActive_sinWompi.toLocaleString("es-CO")} · Vencidos: {summary.renewedExpired_sinWompi.toLocaleString("es-CO")}</Text>
            </View>
            {/* Sin renovar */}
            <View style={[styles.statBox, { flex: 1 }]}>
              <Text style={[styles.statLabel, { marginBottom: 4 }]}>Sin renovar (primer período) — {summary.totalNotRenewed.toLocaleString("es-CO")} ({pct(summary.totalNotRenewed, summary.totalWithPlan)})</Text>
              <LegendRow color={C.blue}   label="Con pago Wompi" value={summary.totalNotRenewed_conWompi} total={summary.totalNotRenewed} />
              <Text style={[styles.statDesc, { marginLeft: 14 }]}>Activos: {summary.notRenewedActive_conWompi.toLocaleString("es-CO")} · Vencidos: {summary.notRenewedExpired_conWompi.toLocaleString("es-CO")}</Text>
              <LegendRow color={C.yellow} label="Cortesía"        value={summary.totalNotRenewed_sinWompi} total={summary.totalNotRenewed} />
              <Text style={[styles.statDesc, { marginLeft: 14 }]}>Activos: {summary.notRenewedActive_sinWompi.toLocaleString("es-CO")} · Vencidos: {summary.notRenewedExpired_sinWompi.toLocaleString("es-CO")}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* NIVEL 3: Activos – fuente de pago */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            De los {summary.totalActive.toLocaleString("es-CO")} activos — fuente de pago (Wompi como fuente de verdad)
          </Text>
          <StatRow
            items={[
              { label: "Pagaron con Wompi", value: summary.activePagaron, total: summary.totalActive, color: C.blue, desc: "≥1 transacción real" },
              { label: "Membresía cortesía", value: summary.activeCortesia, total: summary.totalActive, color: C.yellow, desc: "Sin pago Wompi" },
            ]}
          />

          {/* Desglose pagaron */}
          <View style={[styles.row, { marginTop: 4 }]}>
            <View style={[styles.statBox, { backgroundColor: "#e7f5ff" }]}>
              <Text style={[styles.statLabel, { marginBottom: 4 }]}>Desglose — pagaron con Wompi</Text>
              <LegendRow color={C.blue} label="Pagó – sin renovar" value={summary.activePagaron_sinRenovar} total={summary.activePagaron} />
              <LegendRow color={C.green} label="Pagó + renovó pagando" value={summary.activePagaron_renovaronPagando} total={summary.activePagaron} />
              <LegendRow color={C.teal} label="Pagó + renovó cortesía" value={summary.activePagaron_renovaronCortesia} total={summary.activePagaron} />
              <LegendRow color={C.violet} label="Cortesía original + renovó pagando" value={summary.activePagaron_cortesiaRenovoPagando} total={summary.activePagaron} />
            </View>
            <View style={[styles.statBox, { backgroundColor: "#fff9db" }]}>
              <Text style={[styles.statLabel, { marginBottom: 4 }]}>Desglose — cortesía pura</Text>
              <LegendRow color={C.yellow} label="Cortesía – sin renovar" value={summary.activeCortesia_sinRenovar} total={summary.activeCortesia} />
              <LegendRow color={C.orange} label="Cortesía + renovó cortesía" value={summary.activeCortesia_renovaronCortesia} total={summary.activeCortesia} />
            </View>
          </View>

          {/* Verificación */}
          <View style={styles.verifyRow}>
            <Text style={styles.verifyText}>
              Verificación: {summary.activePagaron.toLocaleString("es-CO")} con Wompi + {summary.activeCortesia.toLocaleString("es-CO")} cortesía = {(summary.activePagaron + summary.activeCortesia).toLocaleString("es-CO")} de {summary.totalActive.toLocaleString("es-CO")} activos
              {summary.activePagaron + summary.activeCortesia === summary.totalActive ? " ✓" : " ✗ (diferencia)"}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Histórico */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Histórico total (activos + vencidos) — comparable con reconciliación Wompi
          </Text>
          <StatRow
            items={[
              {
                label: "Con pago Wompi (histórico)",
                value: summary.totalConWompi,
                total: summary.totalWithPlan,
                color: C.blue,
                desc: `Activos: ${summary.activePagaron.toLocaleString("es-CO")} · Vencidos: ${summary.expiredConWompi.toLocaleString("es-CO")}`,
              },
              {
                label: "Cortesía (histórico)",
                value: summary.totalSinWompi,
                total: summary.totalWithPlan,
                color: C.yellow,
                desc: `Activos: ${summary.activeCortesia.toLocaleString("es-CO")} · Vencidos: ${summary.expiredSinWompi.toLocaleString("es-CO")}`,
              },
              {
                label: "Vencidos con Wompi",
                value: summary.expiredConWompi,
                total: summary.totalExpired,
                color: C.gray,
                desc: "Pagaron pero plan expiró",
              },
            ]}
          />
        </View>

        {/* Footer página 1 */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>GenCampus · Clasificación de Suscripciones</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>

    </Document>
  );
}
