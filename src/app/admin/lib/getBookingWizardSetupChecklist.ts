import { db } from "@/lib/db";

export type SetupChecklistItem = {
  id: string;
  title: string;
  description: string;
  done: boolean;
  optional?: boolean;
  severity: "danger" | "warning" | "info";
  href?: string;
  ctaLabel?: string;
};

export async function getBookingWizardSetupChecklist(): Promise<
  SetupChecklistItem[]
> {
  const mapsKey = (
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY ?? ""
  ).trim();
  const mapsKeyOk = Boolean(mapsKey);

  const [
    activeServicesCount,
    activeVehiclesCount,
    driverCount,
    activeAirportServicesCount,
    activeAirportsWithCoordsCount,
    airportsMissingCoordsCount,
    airportServicesMissingUsableAirportsCount,
  ] = await Promise.all([
    db.serviceType.count({ where: { active: true } }),
    db.vehicle.count({ where: { active: true } }),
    db.user.count({ where: { roles: { has: "DRIVER" } } }),

    db.serviceType.count({
      where: { active: true, airportLeg: { not: "NONE" } },
    }),

    db.airport.count({
      where: { active: true, lat: { not: null }, lng: { not: null } },
    }),

    db.airport.count({
      where: { active: true, OR: [{ lat: null }, { lng: null }] },
    }),

    db.serviceType.count({
      where: {
        active: true,
        airportLeg: { not: "NONE" },
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

  const hasAirportServices = activeAirportServicesCount > 0;
  const airportOptional = !hasAirportServices;

  const items: SetupChecklistItem[] = [
    {
      id: "maps-key",
      title: "Google Maps key",
      description: mapsKeyOk
        ? "Browser key found. Autocomplete + routing will work."
        : "Missing NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY. Autocomplete + routing will not work.",
      done: mapsKeyOk,
      severity: "danger",
      href: "/admin/settings",
      ctaLabel: mapsKeyOk ? "View" : "Fix",
    },
    {
      id: "services",
      title: "Services",
      description:
        activeServicesCount > 0
          ? `${activeServicesCount} active service(s) available for the Booking Wizard.`
          : "Create at least one active service so customers can start a booking.",
      done: activeServicesCount > 0,
      severity: "danger",
      href: activeServicesCount > 0 ? "/admin/services" : "/admin/services/new",
      ctaLabel: activeServicesCount > 0 ? "Manage" : "Add service",
    },
    {
      id: "vehicles",
      title: "Vehicle categories",
      description:
        activeVehiclesCount > 0
          ? `${activeVehiclesCount} active vehicle category(s) available for selection.`
          : "Add at least one active vehicle category (SUV, Sprinter, etc.).",
      done: activeVehiclesCount > 0,
      severity: "danger",
      href: activeVehiclesCount > 0 ? "/admin/vehicles" : "/admin/vehicles/new",
      ctaLabel: activeVehiclesCount > 0 ? "Manage" : "Add vehicle",
    },
    {
      id: "drivers",
      title: "Drivers",
      description:
        driverCount > 0
          ? `${driverCount} driver(s) available for dispatch.`
          : "Add at least one DRIVER user so dispatch can assign trips.",
      done: driverCount > 0,
      severity: "warning",
      href: "/admin/drivers",
      ctaLabel: driverCount > 0 ? "Manage" : "Add driver",
    },
    {
      id: "airports-coords",
      title: "Airports with coordinates",
      description: airportOptional
        ? "Optional until you enable Airport Pickup/Dropoff services."
        : activeAirportsWithCoordsCount > 0
          ? `${activeAirportsWithCoordsCount} airport(s) have coordinates saved.`
          : "Create an airport and select an address suggestion so lat/lng are saved.",
      done: airportOptional ? true : activeAirportsWithCoordsCount > 0,
      optional: airportOptional,
      severity: "warning",
      href: "/admin/airports",
      ctaLabel: airportOptional
        ? "View"
        : activeAirportsWithCoordsCount > 0
          ? "Manage"
          : "Add airport",
    },
    {
      id: "airports-missing-coords",
      title: "Fix airports missing coordinates",
      description: airportOptional
        ? "Optional until you enable Airport Pickup/Dropoff services."
        : airportsMissingCoordsCount === 0
          ? "All active airports have coordinates."
          : `${airportsMissingCoordsCount} airport(s) are missing coordinates. Edit each airport and select an address suggestion.`,
      done: airportOptional ? true : airportsMissingCoordsCount === 0,
      optional: airportOptional,
      severity: "warning",
      href: "/admin/airports",
      ctaLabel:
        airportOptional || airportsMissingCoordsCount === 0 ? "View" : "Review",
    },
    {
      id: "airport-services-assigned",
      title: "Airport services assigned to airports",
      description: airportOptional
        ? "Optional until you enable Airport Pickup/Dropoff services."
        : airportServicesMissingUsableAirportsCount === 0
          ? "All airport services have usable airports assigned."
          : `${airportServicesMissingUsableAirportsCount} airport service(s) have no usable airports assigned.`,
      done: airportOptional
        ? true
        : airportServicesMissingUsableAirportsCount === 0,
      optional: airportOptional,
      severity: "danger",
      href: "/admin/services",
      ctaLabel:
        airportOptional || airportServicesMissingUsableAirportsCount === 0
          ? "View"
          : "Fix services",
    },
  ];

  return items;
}
