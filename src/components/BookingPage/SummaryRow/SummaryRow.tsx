import React from "react";

export default function SummaryRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, borderBottom: '1px solid var(--black300)', paddingBottom: 8, marginBottom: 8 }}>
      <div className='emptyTitleSmall'>{label}</div>
      <div style={{ fontSize: 13, fontWeight: strong ? 800 : 500 }}>
        {value}
      </div>
    </div>
  );
}
