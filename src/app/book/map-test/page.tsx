import MapRouteTest from "./ui/MapRouteTest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function MapTestingPage() {
  return (
    <main style={{ padding: "2rem" }}>
      <h1 style={{ fontSize: "1.75rem", marginBottom: "0.75rem" }}>
        Map + Places + Routes Test
      </h1>
      <p style={{ marginBottom: "1.5rem", opacity: 0.8 }}>
        Use this page to validate Google Autocomplete + route distance/duration.
      </p>
      <MapRouteTest />
    </main>
  );
}
