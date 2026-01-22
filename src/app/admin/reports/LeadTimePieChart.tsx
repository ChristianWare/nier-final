/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useEffect, useRef } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import styles from "./AdminReportsPage.module.css";

const LEAD_TIME_COLORS = [
  "#ef4444", // Same Day - red (urgent)
  "#f97316", // 1 Day - orange
  "#fbbf24", // 2 Days - amber
  "#84cc16", // 3-6 Days - lime
  "#10b981", // 1-2 Weeks - emerald
  "#06b6d4", // 2-4 Weeks - cyan
  "#3b82f6", // 1+ Month - blue (planned)
];

interface DataItem {
  name: string;
  value: number;
  [key: string]: string | number;
}

export default function LeadTimePieChart({ data }: { data: DataItem[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Allow wheel events to propagate for page scrolling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Don't prevent default - let the page scroll
    };

    container.addEventListener("wheel", handleWheel, { passive: true });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <div className={styles.emptyChart}>
        <span>No data available</span>
      </div>
    );
  }

  return (
    <div className={styles.pieChartWrapper} ref={containerRef}>
      <ResponsiveContainer width='100%' height={280}>
        <PieChart>
          <Pie
            data={data}
            dataKey='value'
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
                fill={LEAD_TIME_COLORS[index % LEAD_TIME_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const item = payload[0]?.payload as DataItem;
              const pct =
                total > 0 ? ((item.value / total) * 100).toFixed(1) : "0";

              return (
                <div className={styles.tooltip}>
                  <div className={styles.tooltipTitle}>{item.name}</div>
                  <div className={styles.tooltipGrid}>
                    <span className={styles.tooltipLabel}>Bookings</span>
                    <span className={styles.tooltipValue}>{item.value}</span>
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
              const pct =
                total > 0 && item
                  ? ((item.value / total) * 100).toFixed(0)
                  : "0";
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
