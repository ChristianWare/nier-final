import React from "react";

export default function SummaryRow({
  label,
  value,
  strong,
  noBorder,
}: {
  label: string;
  value: string;
  strong?: boolean;
  noBorder?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        borderBottom: noBorder ? "none" : "1px solid var(--black300)",
        paddingBottom: 8,
        marginBottom: 8,
      }}
    >
      <div className='emptyTitleSmall'>{label}</div>
      <div
        style={{
          fontSize: strong ? 20 : 13,
          fontWeight: strong ? 800 : 500,
          textAlign: "right",
          color: strong ? "var(--darkGreen)" : "var(--black)",
        }}
      >
        {value}
      </div>
    </div>
  );
}
