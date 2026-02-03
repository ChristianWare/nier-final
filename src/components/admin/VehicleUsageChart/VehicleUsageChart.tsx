/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Rectangle,
} from "recharts";

const BAR_RADIUS: [number, number, number, number] = [10, 10, 0, 0];

function UsageBarShape(props: any) {
  const { x, y, width, height, fill } = props;

  return (
    <Rectangle
      x={x}
      y={y}
      width={width}
      height={height}
      fill={fill}
      radius={BAR_RADIUS}
    />
  );
}

export default function VehicleUsageChart({
  data,
}: {
  data: {
    key: string;
    tick: string;
    label: string;
    tripCount: number;
  }[];
}) {
  if (!data || data.length === 0) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--paragraph)",
          fontSize: "1.4rem",
        }}
      >
        No usage data available for this period
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <div
        style={{
          display: "flex",
          gap: "1.5rem",
          marginBottom: "1rem",
          paddingLeft: "0.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 3,
              background: "rgba(37, 99, 235, 0.3)",
              border: "1px solid rgba(37, 99, 235, 0.6)",
            }}
          />
          <span className='miniNote'>Trips</span>
        </div>
      </div>

      <div style={{ width: "100%", height: "calc(100% - 30px)" }}>
        <ResponsiveContainer width='100%' height='100%'>
          <ComposedChart
            data={data}
            margin={{ top: 6, right: 10, bottom: 6, left: 10 }}
          >
            <CartesianGrid stroke='rgba(0,0,0,0.08)' vertical={false} />

            <XAxis
              dataKey='tick'
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12 }}
              interval='preserveStartEnd'
              minTickGap={16}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12 }}
              width={40}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const row = payload[0]?.payload as any;
                return (
                  <div
                    style={{
                      background: "var(--white)",
                      border: "1px solid var(--stroke)",
                      borderRadius: 8,
                      padding: "0.75rem 1rem",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        marginBottom: "0.5rem",
                        fontSize: "1.4rem",
                      }}
                    >
                      {row.label}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "1rem",
                        fontSize: "1.4rem",
                      }}
                    >
                      <span className='miniNote'>Trips</span>
                      <span style={{ fontWeight: 600 }}>
                        {row.tripCount ?? 0}
                      </span>
                    </div>
                  </div>
                );
              }}
            />

            <Bar
              dataKey='tripCount'
              fill='rgba(37, 99, 235, 0.3)'
              stroke='rgba(37, 99, 235, 0.6)'
              strokeWidth={1}
              shape={<UsageBarShape />}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
