/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";

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
      'script[data-google-maps="1"]',
    );

    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Google Maps")),
      );
      return;
    }

    const script = document.createElement("script");
    script.dataset.googleMaps = "1";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      browserKey,
    )}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;

    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load Google Maps script"));
    document.head.appendChild(script);
  });
};

type Props = {
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  pickupAddress: string;
  dropoffAddress: string;
};

export default function RouteMapDisplay({
  pickupLat,
  pickupLng,
  dropoffLat,
  dropoffLng,
  pickupAddress,
  dropoffAddress,
}: Props) {
  const browserKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<any>(null);
  const pickupMarker = useRef<any>(null);
  const dropoffMarker = useRef<any>(null);
  const routePolyline = useRef<any>(null);

  const [error, setError] = useState(() =>
    !browserKey ? "Missing NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY" : "",
  );
  const [loading, setLoading] = useState(() => !!browserKey);

  useEffect(() => {
    if (!browserKey) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        await loadGoogleMaps(browserKey);
        if (cancelled) return;

        const google = window.google;

        // Initialize map
        if (!mapInstance.current && mapRef.current) {
          const center = {
            lat: (pickupLat + dropoffLat) / 2,
            lng: (pickupLng + dropoffLng) / 2,
          };

          mapInstance.current = new google.maps.Map(mapRef.current, {
            center,
            zoom: 12,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          });
        }

        const map = mapInstance.current;

        // Add markers
        if (!pickupMarker.current) {
          pickupMarker.current = new google.maps.Marker({
            map,
            position: { lat: pickupLat, lng: pickupLng },
            label: "A",
            title: pickupAddress,
          });
        }

        if (!dropoffMarker.current) {
          dropoffMarker.current = new google.maps.Marker({
            map,
            position: { lat: dropoffLat, lng: dropoffLng },
            label: "B",
            title: dropoffAddress,
          });
        }

        // Fetch and draw route
        try {
          const res = await fetch("/api/maps/route", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              origin: { lat: pickupLat, lng: pickupLng },
              destination: { lat: dropoffLat, lng: dropoffLng },
            }),
          });

          const data = await res.json();
          if (cancelled) return;

          if (data.encodedPolyline) {
            const geom = google.maps.geometry?.encoding;
            if (geom?.decodePath) {
              const path = geom.decodePath(data.encodedPolyline);

              if (routePolyline.current) {
                routePolyline.current.setMap(null);
              }

              routePolyline.current = new google.maps.Polyline({
                path,
                geodesic: true,
                strokeColor: "#1A73E8",
                strokeOpacity: 0.9,
                strokeWeight: 4,
              });

              routePolyline.current.setMap(map);

              // Fit bounds to route
              const bounds = new google.maps.LatLngBounds();
              path.forEach((p: any) => bounds.extend(p));
              map.fitBounds(bounds, 50);
            }
          } else {
            // No polyline, just fit to markers
            const bounds = new google.maps.LatLngBounds();
            bounds.extend({ lat: pickupLat, lng: pickupLng });
            bounds.extend({ lat: dropoffLat, lng: dropoffLng });
            map.fitBounds(bounds, 50);
          }
        } catch (routeErr) {
          // Route fetch failed, just show markers
          console.warn("Could not fetch route:", routeErr);
          const bounds = new google.maps.LatLngBounds();
          bounds.extend({ lat: pickupLat, lng: pickupLng });
          bounds.extend({ lat: dropoffLat, lng: dropoffLng });
          map.fitBounds(bounds, 50);
        }

        setLoading(false);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "Failed to initialize Google Maps");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    browserKey,
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng,
    pickupAddress,
    dropoffAddress,
  ]);

  if (error) {
    return (
      <div
        style={{
          padding: 16,
          background: "#fef2f2",
          borderRadius: 8,
          color: "#b91c1c",
          fontSize: "0.9rem",
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      {loading && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 10,
            background: "rgba(255,255,255,0.9)",
            padding: "8px 16px",
            borderRadius: 6,
            fontSize: "0.9rem",
          }}
        >
          Loading map…
        </div>
      )}
      <div
        ref={mapRef}
        style={{
          width: "100%",
          height: 300,
          borderRadius: 10,
          border: "1px solid #e0e0e0",
          overflow: "hidden",
          background: "#f5f5f5",
        }}
      />
    </div>
  );
}
