export const viewport = { width: "device-width", initialScale: 1 };

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{`
        html, body, :root { font-size: 16px !important; }
        body { margin: 0 !important; }
      `}</style>
      <div style={{ minHeight: "100svh" }}>{children}</div>
    </>
  );
}
