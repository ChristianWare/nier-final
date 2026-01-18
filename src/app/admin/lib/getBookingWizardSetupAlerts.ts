/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/lib/db";
import type { AlertItem } from "@/components/admin/AdminAlerts/AdminAlerts";

export async function getBookingWizardSetupAlerts(): Promise<AlertItem[]> {
  const alerts: AlertItem[] = [];

  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;
  if (!mapsKey) {
    alerts.push({
      id: "setup-maps-key",
      severity: "danger",
      message:
        "Missing NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY. Address autocomplete + routing won’t work in the Booking Wizard.",
      href: "/admin/settings",
      ctaLabel: "Fix settings",
    });
  }

  const [
    activeServicesCount,
    activeVehiclesCount,
    driverCount,
    airportCount,
    airportsMissingCoordsCount,
    airportServicesMissingAirportsCount,
  ] = await Promise.all([
    db.serviceType.count({ where: { active: true } }),
    db.vehicle.count({ where: { active: true } }),
    db.user.count({ where: { roles: { has: "DRIVER" } } }),
    db.airport.count(),
    db.airport.count({
      where: {
        active: true,
        OR: [{ lat: null }, { lng: null }],
      },
    }),
    db.serviceType.count({
      where: {
        active: true,
        airportLeg: { not: "NONE" as any },
        airports: {
          none: {
            active: true,
            lat: { not: null },
            lng: { not: null },
          },
        },
      },
    }),
  ]);

  if (activeServicesCount === 0) {
    alerts.push({
      id: "setup-no-services",
      severity: "danger",
      message:
        "No active services found. Create at least one service so customers can start a booking.",
      href: "/admin/services/new",
      ctaLabel: "Add service",
    });
  }

  if (activeVehiclesCount === 0) {
    alerts.push({
      id: "setup-no-vehicles",
      severity: "danger",
      message:
        "No active vehicle categories found. Add at least one vehicle category (SUV, Sprinter, etc.) for the Booking Wizard.",
      href: "/admin/vehicles/new",
      ctaLabel: "Add vehicle",
    });
  }

  if (driverCount === 0) {
    alerts.push({
      id: "setup-no-drivers",
      severity: "warning",
      message:
        "No drivers found. Add at least one DRIVER user so dispatch can assign trips.",
      href: "/admin/drivers",
      ctaLabel: "Add driver",
    });
  }

  if (airportCount === 0) {
    alerts.push({
      id: "setup-no-airports",
      severity: "info",
      message:
        "No airports created yet. If you plan to use Airport Pickup/Dropoff services, create airports first.",
      href: "/admin/airports/new",
      ctaLabel: "Add airport",
    });
  }

  if (airportsMissingCoordsCount > 0) {
    alerts.push({
      id: "setup-airports-missing-coords",
      severity: "warning",
      message: `${airportsMissingCoordsCount} airport(s) are missing coordinates (lat/lng). Edit each airport and select an address suggestion so we can save its location.`,
      href: "/admin/airports",
      ctaLabel: "Review airports",
    });
  }

  if (airportServicesMissingAirportsCount > 0) {
    alerts.push({
      id: "setup-airport-services-missing-airports",
      severity: "danger",
      message: `${airportServicesMissingAirportsCount} airport service(s) have no usable airports assigned. Assign airports (with coordinates) to each airport service.`,
      href: "/admin/services",
      ctaLabel: "Fix services",
    });
  }

  return alerts;
}
