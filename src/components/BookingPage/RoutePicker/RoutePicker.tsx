/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type LatLng = { lat: number; lng: number };

export type RoutePickerPlace = {
  address: string;
  placeId: string;
  location: LatLng;
};

export type RoutePickerValue = {
  pickup: RoutePickerPlace | null;
  dropoff: RoutePickerPlace | null;

  // ✅ keep existing names (your app already uses these)
  miles: number | null;
  minutes: number | null;

  // ✅ aliases so the booking wizard can use them too
  distanceMiles?: number | null;
  durationMinutes?: number | null;
};

declare global {
  interface Window {
    google?: any;
  }
}

const loadGoogleMaps = (browserKey: string) => {
  return new Promise<void>((resolve, reject) => {
    if (window.google?.maps?.places && window.google?.maps?.geometry) {
      return resolve();
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-google-maps="1"]'
    );

    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Google Maps"))
      );
      return;
    }

    const script = document.createElement("script");
    script.dataset.googleMaps = "1";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      browserKey
    )}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;

    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load Google Maps script"));
    document.head.appendChild(script);
  });
};

export default function RoutePicker({
  value,
  onChange,
}: {
  value: RoutePickerValue | null;
  onChange: (v: RoutePickerValue) => void;
}) {
  const browserKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;

  const mapRef = useRef<HTMLDivElement | null>(null);
  const pickupRef = useRef<HTMLInputElement | null>(null);
  const dropoffRef = useRef<HTMLInputElement | null>(null);

  const mapInstance = useRef<any>(null);
  const pickupMarker = useRef<any>(null);
  const dropoffMarker = useRef<any>(null);
  const routePolyline = useRef<any>(null);

  const [error, setError] = useState("");
  const [loadingRoute, setLoadingRoute] = useState(false);

  // ✅ keep latest value in a ref to avoid stale closures inside listeners
  const latestValueRef = useRef<RoutePickerValue | null>(value);
  useEffect(() => {
    latestValueRef.current = value;
  }, [value]);

  const pickup = value?.pickup ?? null;
  const dropoff = value?.dropoff ?? null;

  const canRoute = useMemo(() => !!pickup && !!dropoff, [pickup, dropoff]);

  // Init maps + autocomplete (runs once when key exists)
  useEffect(() => {
    if (!browserKey) {
      setError("Missing NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        await loadGoogleMaps(browserKey);
        if (cancelled) return;

        const google = window.google;

        if (!mapInstance.current && mapRef.current) {
          mapInstance.current = new google.maps.Map(mapRef.current, {
            center: { lat: 33.4484, lng: -112.074 }, // Phoenix
            zoom: 10,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          });
        }

        // Pickup autocomplete
        if (pickupRef.current) {
          const ac = new google.maps.places.Autocomplete(pickupRef.current, {
            fields: ["place_id", "formatted_address", "geometry"],
            componentRestrictions: { country: "us" },
          });

          ac.addListener("place_changed", () => {
            const place = ac.getPlace();
            const loc = place?.geometry?.location;
            if (!place?.place_id || !place?.formatted_address || !loc) return;

            const latest = latestValueRef.current;

            onChange({
              pickup: {
                placeId: place.place_id,
                address: place.formatted_address,
                location: { lat: loc.lat(), lng: loc.lng() },
              },
              dropoff: latest?.dropoff ?? null,

              // keep existing
              miles: latest?.miles ?? null,
              minutes: latest?.minutes ?? null,

              // aliases
              distanceMiles: latest?.distanceMiles ?? null,
              durationMinutes: latest?.durationMinutes ?? null,
            });
          });
        }

        // Dropoff autocomplete
        if (dropoffRef.current) {
          const ac = new google.maps.places.Autocomplete(dropoffRef.current, {
            fields: ["place_id", "formatted_address", "geometry"],
            componentRestrictions: { country: "us" },
          });

          ac.addListener("place_changed", () => {
            const place = ac.getPlace();
            const loc = place?.geometry?.location;
            if (!place?.place_id || !place?.formatted_address || !loc) return;

            const latest = latestValueRef.current;

            onChange({
              pickup: latest?.pickup ?? null,
              dropoff: {
                placeId: place.place_id,
                address: place.formatted_address,
                location: { lat: loc.lat(), lng: loc.lng() },
              },

              // keep existing
              miles: latest?.miles ?? null,
              minutes: latest?.minutes ?? null,

              // aliases
              distanceMiles: latest?.distanceMiles ?? null,
              durationMinutes: latest?.durationMinutes ?? null,
            });
          });
        }
      } catch (e: any) {
        setError(e?.message ?? "Failed to initialize Google Maps");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [browserKey, onChange]);

  // Markers (and basic bounds when both points exist)
  useEffect(() => {
    const google = window.google;
    if (!google?.maps || !mapInstance.current) return;

    const map = mapInstance.current;

    if (pickup) {
      if (!pickupMarker.current)
        pickupMarker.current = new google.maps.Marker({ map });
      pickupMarker.current.setPosition(pickup.location);
      pickupMarker.current.setLabel("A");
    } else if (pickupMarker.current) {
      pickupMarker.current.setMap(null);
      pickupMarker.current = null;
    }

    if (dropoff) {
      if (!dropoffMarker.current)
        dropoffMarker.current = new google.maps.Marker({ map });
      dropoffMarker.current.setPosition(dropoff.location);
      dropoffMarker.current.setLabel("B");
    } else if (dropoffMarker.current) {
      dropoffMarker.current.setMap(null);
      dropoffMarker.current = null;
    }

    // If both exist and no polyline yet, fit to endpoints
    if (pickup && dropoff && !routePolyline.current) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(pickup.location);
      bounds.extend(dropoff.location);
      map.fitBounds(bounds, 70);
    }
  }, [pickup, dropoff]);

  // Route compute + polyline draw
  useEffect(() => {
    const google = window.google;

    // If missing either, clear polyline + clear miles/minutes
    if (!pickup || !dropoff) {
      if (routePolyline.current) {
        routePolyline.current.setMap(null);
        routePolyline.current = null;
      }

      onChange({
        pickup,
        dropoff,
        miles: null,
        minutes: null,
        distanceMiles: null,
        durationMinutes: null,
      });
      return;
    }

    if (!google?.maps || !mapInstance.current) return;

    let cancelled = false;

    (async () => {
      try {
        setLoadingRoute(true);
        setError("");

        const res = await fetch("/api/maps/route", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origin: pickup.location,
            destination: dropoff.location,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.details || data?.error || "Route failed");
        }
        if (cancelled) return;

        const miles = data.miles ?? null;
        const minutes = data.minutes ?? null;

        onChange({
          pickup,
          dropoff,

          // original
          miles,
          minutes,

          // aliases
          distanceMiles: miles,
          durationMinutes: minutes,
        });

        // Clear old polyline
        if (routePolyline.current) {
          routePolyline.current.setMap(null);
          routePolyline.current = null;
        }

        // Draw new polyline
        if (data.encodedPolyline) {
          const geom = google.maps.geometry?.encoding;
          if (geom?.decodePath) {
            const path = geom.decodePath(data.encodedPolyline);

            routePolyline.current = new google.maps.Polyline({
              path,
              geodesic: true,
              strokeColor: "#1A73E8", // blue
              strokeOpacity: 0.9,
              strokeWeight: 4,
            });

            routePolyline.current.setMap(mapInstance.current);

            const bounds = new google.maps.LatLngBounds();
            path.forEach((p: any) => bounds.extend(p));
            mapInstance.current.fitBounds(bounds, 70);
          }
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to compute route");
      } finally {
        if (!cancelled) setLoadingRoute(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // ✅ depend on the actual pickup/dropoff identity so it recomputes on changes
  }, [
    pickup?.placeId,
    dropoff?.placeId,
    pickup?.location?.lat,
    pickup?.location?.lng,
    dropoff?.location?.lat,
    dropoff?.location?.lng,
    onChange,
  ]);

  const displayMiles = value?.miles ?? value?.distanceMiles ?? null;

  const displayMinutes = value?.minutes ?? value?.durationMinutes ?? null;

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <label className='cardTitle h5'>Pickup</label>
          <input
            ref={pickupRef}
            placeholder='Enter pickup address'
            style={{
              padding: "0.75rem",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.15)",
            }}
          />
          {pickup && (
            <div style={{ fontSize: 12, opacity: 0.75 }}>{pickup.address}</div>
          )}
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <label className='cardTitle h5'>Dropoff</label>
          <input
            ref={dropoffRef}
            placeholder='Enter dropoff address'
            style={{
              padding: "0.75rem",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.15)",
            }}
          />
          {dropoff && (
            <div style={{ fontSize: 12, opacity: 0.75 }}>{dropoff.address}</div>
          )}
        </div>
      </div>

      <div
        style={{
          padding: "0.75rem",
          borderRadius: 12,
          border: "1px solid rgba(0,0,0,0.12)",
          display: "flex",
          gap: "1rem",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div className='emptyTitleSmall'>Distance</div>
          <div style={{ fontSize: 18 }}>
            {displayMiles == null ? "—" : `${displayMiles} mi`}
          </div>
        </div>

        <div>
          <div className='emptyTitleSmall'>Duration</div>
          <div style={{ fontSize: 18 }}>
            {displayMinutes == null ? "—" : `${displayMinutes} min`}
          </div>
        </div>

        {loadingRoute && <div style={{ opacity: 0.7 }}>Calculating…</div>}
        {error && <div style={{ color: "crimson", fontSize: 14 }}>{error}</div>}
      </div>

      <div
        ref={mapRef}
        style={{
          width: "100%",
          height: 520,
          borderRadius: 14,
          border: "1px solid rgba(0,0,0,0.12)",
          overflow: "hidden",
        }}
      />
    </div>
  );
}
