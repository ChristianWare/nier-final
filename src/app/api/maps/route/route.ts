/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * API Route: /api/maps/route
 * Location: app/api/maps/route/route.ts
 *
 * ✅ UPDATED: Added waypoints support for extra stops
 */

import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.GOOGLE_MAPS_SERVER_KEY;

type LatLng = { lat: number; lng: number };

interface RouteRequestBody {
  origin: LatLng;
  destination: LatLng;
  waypoints?: LatLng[]; // ✅ NEW: Optional waypoints for stops
}

export async function POST(req: NextRequest) {
  try {
    if (!API_KEY) {
      return NextResponse.json(
        { error: "Missing GOOGLE_MAPS_SERVER_KEY" },
        { status: 500 },
      );
    }

    const body: RouteRequestBody = await req.json();
    const { origin, destination, waypoints } = body;

    if (
      !origin?.lat ||
      !origin?.lng ||
      !destination?.lat ||
      !destination?.lng
    ) {
      return NextResponse.json(
        { error: "Invalid origin or destination" },
        { status: 400 },
      );
    }

    // Build request body for Routes API
    const routeRequest: any = {
      origin: {
        location: {
          latLng: { latitude: origin.lat, longitude: origin.lng },
        },
      },
      destination: {
        location: {
          latLng: { latitude: destination.lat, longitude: destination.lng },
        },
      },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
      computeAlternativeRoutes: false,
      languageCode: "en-US",
      units: "IMPERIAL",
    };

    // ✅ Add waypoints (intermediates) if provided
    if (waypoints && waypoints.length > 0) {
      routeRequest.intermediates = waypoints.map((wp) => ({
        location: {
          latLng: { latitude: wp.lat, longitude: wp.lng },
        },
      }));
    }

    const res = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": API_KEY,
          "X-Goog-FieldMask":
            "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs",
        },
        body: JSON.stringify(routeRequest),
      },
    );

    const data = await res.json();

    if (!res.ok || data.error) {
      console.error("Routes API error:", data);
      return NextResponse.json(
        {
          error: "Route calculation failed",
          details: data.error?.message ?? "Unknown error",
        },
        { status: res.status || 500 },
      );
    }

    const route = data.routes?.[0];
    if (!route) {
      return NextResponse.json({ error: "No route found" }, { status: 404 });
    }

    // ✅ Calculate total distance and duration across all legs
    let totalDistanceMeters = 0;
    let totalDurationSeconds = 0;

    if (route.legs && route.legs.length > 0) {
      // Sum up all legs (pickup -> stop1 -> stop2 -> ... -> dropoff)
      route.legs.forEach((leg: any) => {
        totalDistanceMeters += leg.distanceMeters || 0;
        // Duration comes as string like "1234s"
        const durationStr = leg.duration || "0s";
        const durationSec = parseInt(durationStr.replace("s", ""), 10) || 0;
        totalDurationSeconds += durationSec;
      });
    } else {
      // Fallback to route-level values
      totalDistanceMeters = route.distanceMeters || 0;
      const durationStr = route.duration || "0s";
      totalDurationSeconds = parseInt(durationStr.replace("s", ""), 10) || 0;
    }

    const miles = Math.round((totalDistanceMeters / 1609.34) * 10) / 10;
    const minutes = Math.round(totalDurationSeconds / 60);

    return NextResponse.json({
      miles,
      minutes,
      encodedPolyline: route.polyline?.encodedPolyline ?? null,
      // ✅ Include leg details for debugging/display if needed
      legs: route.legs?.map((leg: any, index: number) => ({
        legIndex: index,
        distanceMiles: Math.round((leg.distanceMeters / 1609.34) * 10) / 10,
        durationMinutes: Math.round(
          parseInt((leg.duration || "0s").replace("s", ""), 10) / 60,
        ),
      })),
    });
  } catch (err: any) {
    console.error("Route API error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err?.message },
      { status: 500 },
    );
  }
}
