import { NextResponse } from "next/server";

export const runtime = "nodejs";

type LatLng = { lat: number; lng: number };

const metersToMiles = (meters: number) => meters / 1609.344;

const parseDurationSeconds = (duration: unknown): number | null => {
  // Routes API returns duration like "123s"
  if (typeof duration !== "string") return null;
  const match = duration.match(/^(\d+)(s)$/);
  if (!match) return null;
  return Number(match[1]);
};

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GOOGLE_MAPS_SERVER_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GOOGLE_MAPS_SERVER_KEY" },
        { status: 500 }
      );
    }

    const body = (await req.json()) as {
      origin?: LatLng;
      destination?: LatLng;
    };

    if (
      !body?.origin ||
      !body?.destination ||
      typeof body.origin.lat !== "number" ||
      typeof body.origin.lng !== "number" ||
      typeof body.destination.lat !== "number" ||
      typeof body.destination.lng !== "number"
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid body. Expected { origin: {lat,lng}, destination:{lat,lng} }",
        },
        { status: 400 }
      );
    }

    const url = "https://routes.googleapis.com/directions/v2:computeRoutes";

    const fieldMask =
      "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline";

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fieldMask,
      },
      body: JSON.stringify({
        origin: {
          location: {
            latLng: { latitude: body.origin.lat, longitude: body.origin.lng },
          },
        },
        destination: {
          location: {
            latLng: {
              latitude: body.destination.lat,
              longitude: body.destination.lng,
            },
          },
        },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
        computeAlternativeRoutes: false,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: "Routes API error", details: text },
        { status: 502 }
      );
    }

    const data = (await res.json()) as any;
    const route = data?.routes?.[0];

    const distanceMeters = route?.distanceMeters as number | undefined;
    const durationStr = route?.duration as string | undefined;
    const encodedPolyline = route?.polyline?.encodedPolyline as
      | string
      | undefined;

    if (typeof distanceMeters !== "number") {
      return NextResponse.json(
        { error: "Routes API response missing distanceMeters" },
        { status: 502 }
      );
    }

    const durationSeconds = parseDurationSeconds(durationStr);
    const durationMinutes =
      typeof durationSeconds === "number"
        ? Math.max(1, Math.round(durationSeconds / 60))
        : null;

    const miles = metersToMiles(distanceMeters);

    return NextResponse.json({
      miles: Number(miles.toFixed(2)),
      minutes: durationMinutes,
      encodedPolyline: encodedPolyline ?? null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Unexpected error", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
