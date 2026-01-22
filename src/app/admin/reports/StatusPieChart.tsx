"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import styles from "./AdminReportsPage.module.css";

const DEFAULT_COLORS = [
  "#10b981", // emerald
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#f59e0b", // amber
  "#ef4444", // red
  "#6b7280", // gray
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
  "#f97316", // orange
];

interface DataItem {
  name: string;
  value: number;
  [key: string]: string | number;
}

export default function StatusPieChart({
  data,
  dataKey = "value",
  colors = DEFAULT_COLORS,
  isCurrency = false,
  currency = "USD",
}: {
  data: DataItem[];
  dataKey?: string;
  colors?: string[];
  isCurrency?: boolean;
  currency?: string;
}) {
  const total = data.reduce(
    (sum, item) => sum + (Number(item[dataKey]) || 0),
    0,
  );

  if (total === 0) {
    return (
      <div className={styles.emptyChart}>
        <span>No data available</span>
      </div>
    );
  }

  function formatValue(v: number): string {
    if (isCurrency) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(v / 100);
    }
    return String(v);
  }

  return (
    <div className={styles.pieChartWrapper}>
      <ResponsiveContainer width='100%' height={280}>
        <PieChart>
          <Pie
            data={data}
            dataKey={dataKey}
            nameKey='name'
            cx='50%'
            cy='50%'
            innerRadius={50}
            outerRadius={90}
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={colors[index % colors.length]}
              />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const item = payload[0]?.payload as DataItem;
              const value = Number(item[dataKey]) || 0;
              const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0";

              return (
                <div className={styles.tooltip}>
                  <div className={styles.tooltipTitle}>{item.name}</div>
                  <div className={styles.tooltipGrid}>
                    <span className={styles.tooltipLabel}>Value</span>
                    <span className={styles.tooltipValue}>
                      {formatValue(value)}
                    </span>
                    <span className={styles.tooltipLabel}>Percentage</span>
                    <span className={styles.tooltipValue}>{pct}%</span>
                  </div>
                </div>
              );
            }}
          />
          <Legend
            layout='vertical'
            align='right'
            verticalAlign='middle'
            iconType='circle'
            iconSize={10}
            wrapperStyle={{ fontSize: "12px", paddingLeft: "20px" }}
            formatter={(value) => {
              const item = data.find((d) => d.name === value);
              const val = Number(item?.[dataKey]) || 0;
              const pct = total > 0 ? ((val / total) * 100).toFixed(0) : "0";
              return (
                <span className={styles.legendText}>
                  {value} <span className={styles.legendPct}>({pct}%)</span>
                </span>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
