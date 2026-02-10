export default function TripGroupBadge({
  legNumber,
  totalLegs,
}: {
  legNumber: number;
  totalLegs: number;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: "1.1rem",
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 4,
        background: "rgba(0, 0, 0, 0.06)",
        color: "rgba(0, 0, 0, 0.6)",
        whiteSpace: "nowrap",
      }}
    >
      🔗 Ride {legNumber}/{totalLegs}
    </span>
  );
}