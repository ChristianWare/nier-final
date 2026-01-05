export type WizardStep = 1 | 2 | 3;

export default function Stepper({ step }: { step: WizardStep }) {
  const items = [
    { n: 1 as const, label: "Trip" },
    { n: 2 as const, label: "Vehicle" },
    { n: 3 as const, label: "Confirm" },
  ];

  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      {items.map((it) => (
        <div
          key={it.n}
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid rgba(0,0,0,0.12)",
            background: step === it.n ? "rgba(0,0,0,0.06)" : "transparent",
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 999,
              display: "grid",
              placeItems: "center",
              fontSize: 12,
              fontWeight: 700,
              border: "1px solid rgba(0,0,0,0.18)",
              background: step === it.n ? "rgba(0,0,0,0.10)" : "white",
            }}
          >
            {it.n}
          </div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>{it.label}</div>
        </div>
      ))}
    </div>
  );
}
