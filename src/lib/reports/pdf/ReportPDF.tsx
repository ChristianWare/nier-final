// src/lib/reports/pdf/ReportPDF.tsx
//
// Turns a ReportModel into a PDF with @react-pdf/renderer (the same library
// the invoices use). Charts are drawn directly in the PDF.

import {
  Document,
  Page,
  Path,
  Rect,
  StyleSheet,
  Svg,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { ReportModel, ReportSection } from "../model";

const COLORS = [
  "#4f9d69",
  "#3b82f6",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#ef4444",
  "#84cc16",
  "#94a3b8",
];

const s = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 36,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#111",
  },
  company: { fontSize: 9, color: "#555", marginBottom: 2 },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  period: { fontSize: 11, marginBottom: 2 },
  generated: { fontSize: 8, color: "#777", marginBottom: 12 },
  rule: { borderBottomWidth: 1, borderBottomColor: "#ddd", marginBottom: 12 },
  h2: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  sub: { fontSize: 8, color: "#666", marginBottom: 6 },
  block: { marginBottom: 14 },
  kpiRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 6 },
  kpi: {
    width: "23.25%",
    marginRight: "1.5%",
    marginBottom: 6,
    padding: 6,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 4,
  },
  kpiLabel: { fontSize: 7, color: "#555", textTransform: "uppercase" },
  kpiValue: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 2 },
  kpiSub: { fontSize: 7, color: "#777", marginTop: 2 },
  th: {
    flexDirection: "row",
    backgroundColor: "#f1f1ef",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  trAlt: { backgroundColor: "#fafafa" },
  td: { paddingVertical: 3, paddingHorizontal: 4 },
  bold: { fontFamily: "Helvetica-Bold" },
  right: { textAlign: "right" },
  legendRow: { flexDirection: "row", alignItems: "center", marginBottom: 3 },
  swatch: { width: 7, height: 7, marginRight: 4 },
  note: { fontSize: 8, color: "#444", marginBottom: 3 },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#888",
  },
});

const money = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);

function Kpis({
  items,
}: {
  items: { label: string; value: string; sub?: string }[];
}) {
  return (
    <View style={s.kpiRow} wrap={false}>
      {items.map((k, i) => (
        <View key={i} style={s.kpi}>
          <Text style={s.kpiLabel}>{k.label}</Text>
          <Text style={s.kpiValue}>{k.value}</Text>
          {k.sub ? <Text style={s.kpiSub}>{k.sub}</Text> : null}
        </View>
      ))}
    </View>
  );
}

function BarChart({
  title,
  subtitle,
  points,
  isMoney,
}: {
  title: string;
  subtitle?: string;
  points: { label: string; value: number }[];
  isMoney?: boolean;
}) {
  const W = 540;
  const H = 140;
  const left = 46;
  const bottom = 18;
  const max = Math.max(1, ...points.map((p) => p.value));
  const plotW = W - left - 6;
  const plotH = H - bottom - 6;
  const step = points.length ? plotW / points.length : plotW;
  const barW = Math.max(2, Math.min(28, step * 0.7));
  const every = Math.max(1, Math.ceil(points.length / 12));
  const fmt = (v: number) => (isMoney ? money(v) : String(Math.round(v)));
  return (
    <View style={s.block} wrap={false}>
      <Text style={s.h2}>{title}</Text>
      {subtitle ? <Text style={s.sub}>{subtitle}</Text> : null}
      <View style={{ position: "relative", width: W, height: H }}>
        <Svg width={W} height={H}>
          <Rect x={left} y={6} width={plotW} height={0.5} fill='#ddd' />
          <Rect
            x={left}
            y={6 + plotH / 2}
            width={plotW}
            height={0.5}
            fill='#eee'
          />
          <Rect x={left} y={6 + plotH} width={plotW} height={0.7} fill='#bbb' />
          {points.map((p, i) => {
            const h = (p.value / max) * plotH;
            return (
              <Rect
                key={i}
                x={left + i * step + (step - barW) / 2}
                y={6 + plotH - h}
                width={barW}
                height={Math.max(0, h)}
                fill={COLORS[0]}
              />
            );
          })}
        </Svg>
        <Text
          style={{
            position: "absolute",
            left: 0,
            top: 2,
            width: left - 4,
            fontSize: 7,
            textAlign: "right",
            color: "#666",
          }}
        >
          {fmt(max)}
        </Text>
        <Text
          style={{
            position: "absolute",
            left: 0,
            top: 2 + plotH / 2,
            width: left - 4,
            fontSize: 7,
            textAlign: "right",
            color: "#666",
          }}
        >
          {fmt(max / 2)}
        </Text>
        <Text
          style={{
            position: "absolute",
            left: 0,
            top: plotH,
            width: left - 4,
            fontSize: 7,
            textAlign: "right",
            color: "#666",
          }}
        >
          {fmt(0)}
        </Text>
        {points.map((p, i) =>
          i % every === 0 ? (
            <Text
              key={i}
              style={{
                position: "absolute",
                top: H - bottom + 4,
                left: left + i * step + step / 2 - 20,
                width: 40,
                fontSize: 6.5,
                textAlign: "center",
                color: "#666",
              }}
            >
              {p.label}
            </Text>
          ) : null,
        )}
      </View>
    </View>
  );
}

function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p = (a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
}

function Donut({
  title,
  slices,
  isMoney,
}: {
  title: string;
  slices: { label: string; value: number }[];
  isMoney?: boolean;
}) {
  const shown = slices.filter((x) => x.value > 0);
  const total = shown.reduce((a, b) => a + b.value, 0);
  // Slice outlines, worked out before rendering.
  const paths: string[] = [];
  let angle = -Math.PI / 2;
  for (const x of shown) {
    const next = angle + (total > 0 ? (x.value / total) * Math.PI * 2 : 0);
    paths.push(
      shown.length === 1
        ? "M 55 5 A 50 50 0 1 1 54.99 5 Z"
        : arc(55, 55, 50, angle, next),
    );
    angle = next;
  }
  return (
    <View style={s.block} wrap={false}>
      <Text style={s.h2}>{title}</Text>
      {total <= 0 ? (
        <Text style={s.sub}>Nothing in this period.</Text>
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Svg width={110} height={110}>
            {paths.map((d, i) => (
              <Path key={i} d={d} fill={COLORS[i % COLORS.length]} />
            ))}
            <Path d='M 55 30 A 25 25 0 1 1 54.99 30 Z' fill='#ffffff' />
          </Svg>
          <View style={{ marginLeft: 14, flexGrow: 1 }}>
            {shown.map((x, i) => (
              <View key={i} style={s.legendRow}>
                <View
                  style={[
                    s.swatch,
                    { backgroundColor: COLORS[i % COLORS.length] },
                  ]}
                />
                <Text>
                  {x.label}: {isMoney ? money(x.value) : x.value} (
                  {Math.round((x.value / total) * 100)}%)
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function Table(sec: Extract<ReportSection, { kind: "table" }>) {
  const flex = sec.columns.map((c) => c.flex ?? 1);
  const cellStyle = (i: number) => [
    s.td,
    { flex: flex[i] },
    sec.columns[i].align === "right" ? s.right : {},
  ];
  return (
    <View style={s.block}>
      <Text style={s.h2} minPresenceAhead={60}>
        {sec.title}
      </Text>
      {sec.subtitle ? <Text style={s.sub}>{sec.subtitle}</Text> : null}
      {sec.rows.length === 0 ? (
        <Text style={s.sub}>{sec.emptyText ?? "Nothing in this period."}</Text>
      ) : (
        <View>
          <View style={s.th} wrap={false}>
            {sec.columns.map((c, i) => (
              <Text key={i} style={[...cellStyle(i), s.bold]}>
                {c.label}
              </Text>
            ))}
          </View>
          {sec.rows.map((r, ri) => (
            <View key={ri} style={[s.tr, ri % 2 ? s.trAlt : {}]} wrap={false}>
              {r.map((v, i) => (
                <Text key={i} style={cellStyle(i)}>
                  {v}
                </Text>
              ))}
            </View>
          ))}
          {sec.totals ? (
            <View
              style={[s.tr, { borderTopWidth: 1, borderTopColor: "#bbb" }]}
              wrap={false}
            >
              {sec.totals.map((v, i) => (
                <Text key={i} style={[...cellStyle(i), s.bold]}>
                  {v}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

function Section({ section }: { section: ReportSection }) {
  switch (section.kind) {
    case "kpis":
      return <Kpis items={section.items} />;
    case "bar":
      return (
        <BarChart
          title={section.title}
          subtitle={section.subtitle}
          points={section.points}
          isMoney={section.money}
        />
      );
    case "donut":
      return (
        <Donut
          title={section.title}
          slices={section.slices}
          isMoney={section.money}
        />
      );
    case "table":
      return <Table {...section} />;
    case "notes":
      return (
        <View style={s.block} wrap={false}>
          {section.title ? <Text style={s.h2}>{section.title}</Text> : null}
          {section.lines.map((l, i) => (
            <Text key={i} style={s.note}>
              • {l}
            </Text>
          ))}
        </View>
      );
    case "pageBreak":
      return <View break />;
  }
}

export function ReportDocument({ model }: { model: ReportModel }) {
  return (
    <Document
      title={`${model.title} · ${model.periodLabel}`}
      author={model.companyName}
    >
      <Page size='LETTER' style={s.page}>
        <Text style={s.company}>{model.companyName}</Text>
        <Text style={s.title}>{model.title}</Text>
        <Text style={s.period}>{model.periodLabel}</Text>
        <Text style={s.generated}>{model.generatedLabel}</Text>
        <View style={s.rule} />
        {model.sections.map((sec, i) => (
          <Section key={i} section={sec} />
        ))}
        <View style={s.footer} fixed>
          <Text>
            {model.companyName} · {model.title} · {model.periodLabel}
          </Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

export async function renderReportPdf(model: ReportModel): Promise<Buffer> {
  return renderToBuffer(<ReportDocument model={model} />);
}
